(() => {
  const navbar = document.querySelector("[data-navbar]");
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  const scrollLinks = Array.from(document.querySelectorAll("[data-scroll-target]"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));

  const navOffset = () => (navbar ? navbar.offsetHeight + 12 : 0);

  function closeMobileMenu() {
    if (!mobileMenu || !mobileMenuButton) {
      return;
    }

    mobileMenu.classList.add("hidden");
    mobileMenuButton.setAttribute("aria-expanded", "false");
  }

  function toggleMobileMenu() {
    if (!mobileMenu || !mobileMenuButton) {
      return;
    }

    const willExpand = mobileMenu.classList.contains("hidden");
    mobileMenu.classList.toggle("hidden", !willExpand);
    mobileMenuButton.setAttribute("aria-expanded", willExpand ? "true" : "false");
  }

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const top = section.getBoundingClientRect().top + window.scrollY - navOffset();
    window.scrollTo({ top, behavior: "smooth" });
  }

  scrollLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const sectionId = link.getAttribute("data-scroll-target");
      if (!sectionId) {
        return;
      }

      const isInternalAnchor = link.tagName.toLowerCase() === "a" && link.getAttribute("href")?.startsWith("#");
      if (isInternalAnchor || link.tagName.toLowerCase() === "button") {
        event.preventDefault();
        scrollToSection(sectionId);
        closeMobileMenu();
      }
    });
  });

  mobileMenuButton?.addEventListener("click", toggleMobileMenu);

  document.addEventListener("click", (event) => {
    if (!mobileMenu || !mobileMenuButton || mobileMenu.classList.contains("hidden")) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!mobileMenu.contains(target) && !mobileMenuButton.contains(target)) {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      closeMobileMenu();
    }
  });

  const sectionIds = Array.from(new Set(navLinks.map((link) => link.getAttribute("data-nav-link")).filter(Boolean)));
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function setActiveLink(activeId) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("data-nav-link") === activeId;
      link.classList.toggle("text-graphly-accent-mint", isActive);
      link.classList.toggle("font-semibold", isActive);
      link.classList.toggle("text-graphly-text-muted", !isActive);
    });
  }

  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) {
          return;
        }

        const activeId = visible[0].target.getAttribute("id");
        if (activeId) {
          setActiveLink(activeId);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.55],
        rootMargin: `-${navOffset()}px 0px -45% 0px`,
      },
    );

    sections.forEach((section) => observer.observe(section));
  }

  setActiveLink("home");
})();

