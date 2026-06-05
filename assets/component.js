import { requestIdleCallback } from '@theme/utilities';

/*
 * Declarative shadow DOM is only initialized on the initial render of the page.
 * If the component is mounted after the browser finishes the initial render,
 * the shadow root needs to be manually hydrated.
 */
export class DeclarativeShadowElement extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) {
      const template = this.querySelector(
        ':scope > template[shadowrootmode="open"]'
      );

      if (!(template instanceof HTMLTemplateElement)) return;

      const shadow = this.attachShadow({
        mode: 'open',
      });

      shadow.append(template.content.cloneNode(true));
    }
  }
}

/**
 * @typedef {Record<string, Element | Element[] | undefined>} Refs
 */

/**
 * @template {Refs} T
 * @typedef {T & Refs} RefsType
 */

/**
 * Base class that powers our custom web components.
 *
 * Manages references to child elements with `ref` attributes and sets up mutation observers to keep
 * the refs updated when the DOM changes. Also handles declarative event listeners using.
 *
 * @template {Refs} [T=Refs]
 * @extends {DeclarativeShadowElement}
 */
export class Component extends DeclarativeShadowElement {
  /**
   * @type {RefsType<T>}
   */
  refs = /** @type {RefsType<T>} */ ({});

  /**
   * An array of required refs. If a ref is not found, an error will be thrown.
   *
   * @type {string[] | undefined}
   */
  requiredRefs;

  /**
   * Get roots
   */
  get roots() {
    return this.shadowRoot
      ? [this, this.shadowRoot]
      : [this];
  }

  /**
   * Called when the element is connected to the document's DOM.
   *
   * Initializes event listeners and refs.
   */
  connectedCallback() {
    super.connectedCallback();

    registerEventListeners();

    this.#safeUpdateRefs();

    requestIdleCallback(() => {
      for (const root of this.roots) {
        this.#mutationObserver.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['ref'],
          attributeOldValue: true,
        });
      }
    });
  }

  /**
   * Called when the element is re-rendered by the Section Rendering API.
   */
  updatedCallback() {
    this.#mutationObserver.takeRecords();

    this.#safeUpdateRefs();
  }

  /**
   * Disconnected
   */
  disconnectedCallback() {
    this.#mutationObserver.disconnect();
  }

  /**
   * SAFE refs updater
   * Prevent app crash if ref missing
   */
  #safeUpdateRefs() {
    try {
      this.#updateRefs();
    } catch (error) {
      console.warn(error);
    }
  }

  /**
   * Update refs
   */
  #updateRefs() {
    const refs = /** @type any */ ({});

    const elements = this.roots.reduce(
      (acc, root) => {
        for (const element of root.querySelectorAll('[ref]')) {
          if (!this.#isDescendant(element)) continue;

          acc.add(element);
        }

        return acc;
      },
      /** @type {Set<Element>} */ (new Set())
    );

    for (const ref of elements) {
      const refName = ref.getAttribute('ref') ?? '';

      const isArray = refName.endsWith('[]');

      const path = isArray
        ? refName.slice(0, -2)
        : refName;

      if (isArray) {
        const array = Array.isArray(refs[path])
          ? refs[path]
          : [];

        array.push(ref);

        refs[path] = array;
      } else {
        refs[path] = ref;
      }
    }

    /*
     * IMPORTANT FIX
     * Missing required ref should NOT crash app
     */
    if (this.requiredRefs?.length) {
      for (const ref of this.requiredRefs) {
        if (!(ref in refs)) {
          console.warn(
            `Missing ref "${ref}" in component ${this.tagName.toLowerCase()}`
          );

          refs[ref] = null;
        }
      }
    }

    this.refs = /** @type {RefsType<T>} */ (refs);
  }

  /**
   * Mutation observer
   */
  #mutationObserver = new MutationObserver(
    (mutations) => {
      if (
        mutations.some(
          (m) =>
            (m.type === 'attributes' &&
              this.#isDescendant(m.target)) ||
            (m.type === 'childList' &&
              [...m.addedNodes, ...m.removedNodes].some(
                this.#isDescendant
              ))
        )
      ) {
        this.#safeUpdateRefs();
      }
    }
  );

  /**
   * Is descendant
   */
  #isDescendant = (node) =>
    getClosestComponent(getAncestor(node)) === this;
}

/**
 * Get ancestor
 */
function getAncestor(node) {
  if (node.parentNode) return node.parentNode;

  const root = node.getRootNode();

  if (root instanceof ShadowRoot) {
    return root.host;
  }

  return null;
}

/**
 * Get closest component
 */
function getClosestComponent(node) {
  if (!node) return null;

  if (node instanceof Component) return node;

  if (
    node instanceof HTMLElement &&
    node.tagName.toLowerCase().endsWith('-component')
  ) {
    return node;
  }

  const ancestor = getAncestor(node);

  if (ancestor) {
    return getClosestComponent(ancestor);
  }

  return null;
}

/**
 * Register event listeners
 */
let initialized = false;

function registerEventListeners() {
  if (initialized) return;

  initialized = true;

  const events = [
    'click',
    'change',
    'select',
    'focus',
    'blur',
    'submit',
    'input',
    'keydown',
    'keyup',
    'toggle',
  ];

  const shouldBubble = ['focus', 'blur'];

  const expensiveEvents = [
    'pointerenter',
    'pointerleave',
  ];

  for (const eventName of [
    ...events,
    ...expensiveEvents,
  ]) {
    const attribute = `on:${eventName}`;

    document.addEventListener(
      eventName,
      (event) => {
        const element = getElement(event);

        if (!element) return;

        const proxiedEvent =
          event.target !== element
            ? new Proxy(event, {
                get(target, property) {
                  if (property === 'target') {
                    return element;
                  }

                  const value = Reflect.get(
                    target,
                    property
                  );

                  if (typeof value === 'function') {
                    return value.bind(target);
                  }

                  return value;
                },
              })
            : event;

        const value =
          element.getAttribute(attribute) ?? '';

        let [selector, method] = value.split('/');

        const matches = value.match(
          /([\/\?][^\/\?]+)([\/\?][^\/\?]+)$/
        );

        const data = matches ? matches[2] : null;

        const instance = selector
          ? selector.startsWith('#')
            ? document.querySelector(selector)
            : element.closest(selector)
          : getClosestComponent(element);

        if (
          !(instance instanceof Component) ||
          !method
        ) {
          return;
        }

        method = method.replace(/\?.*/, '');

        const callback =
          /** @type {any} */ (instance)[method];

        if (typeof callback === 'function') {
          try {
            const args = [proxiedEvent];

            if (data) {
              args.unshift(parseData(data));
            }

            callback.call(instance, ...args);
          } catch (error) {
            console.error(error);
          }
        }
      },
      { capture: true }
    );
  }

  /**
   * Get element
   */
  function getElement(event) {
    const target =
      event.composedPath?.()[0] ?? event.target;

    if (!(target instanceof Element)) return;

    if (
      target.hasAttribute(`on:${event.type}`)
    ) {
      return target;
    }

    if (expensiveEvents.includes(event.type)) {
      return null;
    }

    return event.bubbles ||
      shouldBubble.includes(event.type)
      ? target.closest(`[on\\:${event.type}]`)
      : null;
  }
}

/**
 * Parse data
 */
function parseData(str) {
  const delimiter = str[0];

  const data = str.slice(1);

  return delimiter === '?'
    ? Object.fromEntries(
        Array.from(
          new URLSearchParams(data).entries()
        ).map(([key, value]) => [
          key,
          parseValue(value),
        ])
      )
    : parseValue(data);
}

/**
 * Parse value
 */
function parseValue(str) {
  if (str === 'true') return true;

  if (str === 'false') return false;

  const maybeNumber = Number(str);

  if (
    !isNaN(maybeNumber) &&
    str.trim() !== ''
  ) {
    return maybeNumber;
  }

  return str;
}

/**
 * Missing Ref Error
 */
class MissingRefError extends Error {
  constructor(ref, component) {
    super(
      `Required ref "${ref}" not found in component ${component.tagName.toLowerCase()}`
    );
  }
}