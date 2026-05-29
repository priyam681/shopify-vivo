import { Component } from '@theme/component';

import {
  debounce,
  onDocumentLoaded,
  setHeaderMenuStyle,
} from '@theme/utilities';

import { MegaMenuHoverEvent } from '@theme/events';

class HeaderMenu extends Component {
  requiredRefs = ['overflowMenu'];

  #state = {
    activeItem: null,
  };

  connectedCallback() {
    super.connectedCallback();

    onDocumentLoaded(this.#preloadImages);

    window.addEventListener('resize', this.#resizeListener);

    this.overflowMenu?.addEventListener('pointerleave', this.#overflowSubmenuListener);

    this.#bindMobileMenuClick();

    if (window.innerWidth < 992) {
      if (document.readyState === 'complete') {
        requestAnimationFrame(() => {
          this.#openFirstSubmenuMobile(true);
        });
      } else {
        window.addEventListener('load', () => {
          requestAnimationFrame(() => {
            this.#openFirstSubmenuMobile(true);
          });
        });
      }
    }

    document.addEventListener('click', this.#handleOutsideClick);
  }

  #getAllMenuItems() {
    return [
      ...this.querySelectorAll('[ref="menuitem"]'),
      ...(this.refs.overflowMenu?.shadowRoot?.querySelectorAll('[ref="menuitem"]') ?? []),
    ];
  }

  #getAllSubmenus() {
    return [
      ...this.querySelectorAll('.menu-list__submenu'),
      ...(this.refs.overflowMenu?.shadowRoot?.querySelectorAll('.menu-list__submenu') ?? []),
    ];
  }

  #getFirstListItem() {
    let firstListItem = this.querySelector('.menu-list__list-item');

    if (!firstListItem) {
      firstListItem = this.refs.overflowMenu?.shadowRoot?.querySelector(
        '.menu-list__list-item'
      );
    }

    return firstListItem ?? null;
  }

  #handleOutsideClick = (event) => {
    if (window.innerWidth >= 992) return;

    if (event.target instanceof HTMLAnchorElement) return;
    if (event.target.closest('a')) return;

    if (!this.contains(event.target)) {
      const hamburger =
        document.querySelector('[ref="mobile-menu-toggle"]') ||
        document.querySelector('mobile-menu-toggle');

      if (hamburger?.contains(event.target)) return;

      this.querySelectorAll('[ref="menuitem"]').forEach((item) => {
        item.setAttribute('aria-expanded', 'false');
      });

      this.querySelectorAll('.menu-list__submenu').forEach((submenu) => {
        submenu.style.display = 'none';
      });

      this.headerComponent?.style.setProperty('--submenu-height', '0px');
      this.style.setProperty('--submenu-opacity', '0');
      this.#state.activeItem = null;

      // activeItem null hai ab, toh guard allow karega first item open karne ko
      requestAnimationFrame(() => {
        this.#openFirstSubmenuMobile();
      });
    }
  };

  #openFirstSubmenuMobile(force = false) {
    if (window.innerWidth >= 992) return;

    // Sirf tab rok jab user ne manually koi item select kiya ho
    // force=true hoga page load aur hamburger click pe
    if (!force && this.#state.activeItem) return;

    const firstListItem = this.querySelector('.menu-list__list-item');
    if (!firstListItem) return;

    const firstMenuItem =
      firstListItem.querySelector('[ref="menuitem"]') ||
      firstListItem.querySelector('.menu-list__link');

    const firstSubmenu = firstListItem.querySelector('.menu-list__submenu');

    if (!firstMenuItem || !firstSubmenu) return;

    this.querySelectorAll('[ref="menuitem"], .menu-list__link').forEach((item) => {
      item.setAttribute('aria-expanded', 'false');
    });

    this.querySelectorAll('.menu-list__submenu').forEach((submenu) => {
      submenu.style.display = 'none';
      submenu.hidden = true;
    });

    firstMenuItem.setAttribute('aria-expanded', 'true');
    firstMenuItem.ariaExpanded = 'true';

    firstSubmenu.hidden = false;
    firstSubmenu.style.removeProperty('display');
    firstSubmenu.style.display = 'block';
    firstSubmenu.style.visibility = 'visible';
    firstSubmenu.style.opacity = '1';

    this.#state.activeItem = firstMenuItem;

    const submenuHeight = firstSubmenu.scrollHeight || 0;

    this.headerComponent?.style.setProperty('--submenu-height', `${submenuHeight}px`);
    this.style.setProperty('--submenu-opacity', '1');
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener(
      'resize',
      this.#resizeListener
    );

    document.removeEventListener(
      'click',
      this.#handleOutsideClick
    );

    this.overflowMenu?.removeEventListener(
      'pointerleave',
      this.#overflowSubmenuListener
    );
  }

  #resizeListener = debounce(() => {
    setHeaderMenuStyle();

    if (window.innerWidth < 992) {
      this.#openFirstSubmenuMobile(true);
    }
  }, 100);

  #overflowSubmenuListener = () => {
    this.#deactivate();
  };

  get overflowMenu() {
    return this.refs.overflowMenu?.shadowRoot?.querySelector(
      '[part="overflow"]'
    );
  }

  get headerComponent() {
    return this.closest('header-component');
  }

  activate = (event) => {
    if (window.innerWidth < 992) return;

    this.dispatchEvent(
      new MegaMenuHoverEvent()
    );

    if (!(event.target instanceof Element)) return;

    const item = findMenuItem(event.target);

    if (!item) return;

    const submenu = findSubmenu(item);

    this.querySelectorAll('.menu-list__submenu').forEach((menu) => {
      menu.style.display = 'none';
    });

    this.querySelectorAll('[ref="menuitem"]').forEach((menuItem) => {
      menuItem.setAttribute('aria-expanded', 'false');
    });

    item.setAttribute('aria-expanded', 'true');

    if (submenu) {
      submenu.style.display = 'block';

      const finalHeight = submenu.scrollHeight || 0;

      this.headerComponent?.style.setProperty(
        '--submenu-height',
        `${finalHeight}px`
      );

      this.style.setProperty('--submenu-opacity', '1');
    }

    this.#state.activeItem = item;
  };

  deactivate(event) {
    if (window.innerWidth < 992) return;

    if (!(event.target instanceof Element)) return;

    this.#deactivate();
  }

  #deactivate = () => {
    this.querySelectorAll('.menu-list__submenu').forEach((submenu) => {
      submenu.style.display = 'none';
    });

    this.querySelectorAll('[ref="menuitem"]').forEach((item) => {
      item.setAttribute('aria-expanded', 'false');
    });

    this.headerComponent?.style.setProperty('--submenu-height', '0px');

    this.style.setProperty('--submenu-opacity', '0');

    this.#state.activeItem = null;
  };

  #bindMobileMenuClick() {
    const hamburger =
      document.querySelector('[ref="mobile-menu-toggle"]') ||
      document.querySelector('mobile-menu-toggle');

    hamburger?.addEventListener('click', () => {
      requestAnimationFrame(() => {
        this.#openFirstSubmenuMobile(true);
      });
    });

    const menuItems = this.querySelectorAll('.menu-list__list-item');

    menuItems.forEach((listItem) => {
      const menuLink = listItem.querySelector('[ref="menuitem"]');
      const submenu = listItem.querySelector('.menu-list__submenu');

      if (!menuLink) return;

     menuLink.addEventListener('click', (event) => {
     if (window.innerWidth >= 992) return;

  if (!submenu) {
    event.preventDefault();
    event.stopPropagation();
  }

  event.preventDefault();
  event.stopPropagation();

  const isOpen = menuLink.getAttribute('aria-expanded') === 'true';
  if (isOpen) return;
  this.querySelectorAll('[ref="menuitem"]').forEach((item) => {
    item.setAttribute('aria-expanded', 'false');
  });

  this.querySelectorAll('.menu-list__submenu').forEach((menu) => {
    menu.style.display = 'none';
  });
  menuLink.setAttribute('aria-expanded', 'true');
  submenu.style.display = 'block';
  this.#state.activeItem = menuLink;

  const submenuHeight = submenu.scrollHeight || 0;
  this.headerComponent?.style.setProperty('--submenu-height', `${submenuHeight}px`);
  this.style.setProperty('--submenu-opacity', '1');
     });
    });
  }

  #preloadImages = () => {
    const images = this.querySelectorAll('img[loading="lazy"]');

    images.forEach((image) => {
      image.removeAttribute('loading');
    });
  };
}

if (!customElements.get('header-menu')) {
  customElements.define('header-menu', HeaderMenu);
}

function findMenuItem(element) {
  if (!(element instanceof Element)) return null;

  return element?.querySelector('[ref="menuitem"]');
}

function findSubmenu(element) {
  const submenu = element?.parentElement?.querySelector('.menu-list__submenu');

  return submenu instanceof HTMLElement ? submenu : null;
}