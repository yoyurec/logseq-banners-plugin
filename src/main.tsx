import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

const pluginId = PL.id;

let root: HTMLElement;
let body: HTMLElement;

let pageType: string;
let isJournal: boolean;
let currentPage;
//@ts-expect-error
let currentPageProps;

let bannerHeight: string,
  useDefaultBanner: boolean,
  useDefaultIcon: boolean,
  defaultPageBanner: string,
  defaultPageIcon: string,
  defaultJournalBanner: string,
  defaultJournalIcon: string;

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsArray: SettingSchemaDesc[] = [
  {
    key: "bannerHeight",
    title: "Banner height",
    type: "string",
    description: "",
    default: "30%",
  },
  {
    key: "useDefaultBanner",
    title: "Use default banners",
    type: "boolean",
    description: "Show default banner when 'banner::' property is not set?",
    default: true,
  },
  {
    key: "defaultPageBanner",
    title: "Default banner (page)",
    type: "string",
    description: "Banner image URL for common pages",
    default: settingsDefaultPageBanner,
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner (journal)",
    type: "string",
    description: "Banner image URL for journal pages",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "useDefaultIcon",
    title: "Use default icons",
    type: "boolean",
    description: "Show default icon when 'page-icon::' property is not set?",
    default: true,
  },
  {
    key: "defaultPageIcon",
    title: "Default icon (page)",
    type: "string",
    description: "Emoji for pages",
    default: "📄",
  },
  {
    key: "defaultJournalIcon",
    title: "Default icon (journal)",
    type: "string",
    description: "Emoji for journals",
    default: "📅",
  }
]

const initStyles = () => {
  root.style.setProperty("--bannerHeight", `${bannerHeight}`);

  logseq.provideStyle(`
    .is-banner-active #main-content-container {
      flex-wrap: wrap;
      align-content: flex-start;
    }
    .is-banner-active .cp__sidebar-main-content {
      flex-basis: 100%;
  }
    .is-banner-active .cp__sidebar-main-content > .max-w-7xl {
      margin-left: 0;
      margin-right: 0;
    }
    .content {
      position: relative;
    }
    .is-banner-active #main-content-container::before {
      content: "";
      width: 100%;
      height: var(--bannerHeight);
      background-image: var(--pageBanner);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: 50%;
    }
    .is-banner-active.is-icon-active .journal-item:first-of-type > .page > .flex-col > .content > .flex-1::before,
    .is-banner-active.is-icon-active .page > .relative > .flex-row > .flex-1::before {
      display: block;
      content: " ";
      padding-top: 50px;
    }
    .is-banner-active.is-icon-active .journal-item:first-of-type > .page > .flex-col > .content > .flex-1::after,
    .is-banner-active.is-icon-active .page > .relative > .flex-row > .flex-1::after {
      content: var(--pageIcon);
      font-size: 50px;
      font-weight: normal;
      position: absolute;
      top: -30px;
      left: -7px;
      line-height: initial;
    }
    .is-banner-active.is-icon-active #journals .journal-item:first-child {
      margin-top: 0;
    }
    .is-banner-active.is-icon-active #journals .journal-item h1.title::before {
      content: "${defaultJournalIcon}";
      margin-right: 8px;
      font-size: 0.9em;
      font-weight: normal;
    }
    .is-banner-active.is-icon-active #journals .journal-item:first-of-type h1.title::before {
      display: none;
    }
  `)
}

// Read settings
const readPluginSettings = () => {
  const pluginSettings = logseq.settings;
  if (pluginSettings) {
    ({
      bannerHeight,
      useDefaultBanner,
      useDefaultIcon,
      defaultPageBanner,
      defaultJournalBanner,
      defaultPageIcon,
      defaultJournalIcon
    } = pluginSettings);
  }
  if (useDefaultBanner) {
    encodeDefaultBanners();
  }
}

// Render
const render = async () => {
  // Hide banner on ever render start if no default allowed
  if (!useDefaultBanner) {
    body.classList.remove("is-banner-active");
  }
  // Hide icon on ever render start if no default allowed
  if (!useDefaultIcon) {
    body.classList.remove("is-icon-active");
  }
  pageType = getPageType();
  if (!isPageTypeOk()) {
    body.classList.remove("is-icon-active");
    body.classList.remove("is-banner-active");
    return;
  }
  if (pageType !== "home") {
    currentPage = await logseq.Editor.getCurrentPage();
    if (currentPage) {
      isJournal = currentPage?.["journal?"];
      //@ts-expect-error
      currentPageProps = currentPage?.properties;
    }
  }
  renderBanner();
}

// Get page type
const getPageType = () => {
  return body.getAttribute("data-page")!;
}

// Skip "system pasges", show/hide banner and icon
const isPageTypeOk = () => {
  if (pageType === "page" || pageType === "home") {
    return true;
  }
  return false;
}

// Generate Base64 from image URL
const getBase64FromUrl = async (url: string): Promise<string> => {
  let data;
  try {
    data = await fetch(url);
  } catch (error) {
    return "";
  }
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    }
  });
}

// Get and encode default banners for reusing
const encodeDefaultBanners = async () => {
  defaultPageBanner = await getBase64FromUrl(defaultPageBanner || settingsDefaultPageBanner);
  defaultJournalBanner = await getBase64FromUrl(defaultJournalBanner || settingsDefaultJournalBanner);
}

// Default page or journal icon?
const chooseDefaultIcon = async () => {
  return isJournal ? defaultJournalIcon : defaultPageIcon;
}

// Read icon from page props
const getPropsIcon = async () => {
  //@ts-expect-error
  return currentPageProps?.pageIcon;
}

// Set icon
const getIcon = async () => {
  let pageIcon = "";
  // Using journal default icon, home page
  if (pageType === "home" && useDefaultIcon) {
    console.info(`#${pluginId}: Using journal default icon, home page`)
    return defaultJournalIcon;
  }
  // Read from page props
  pageIcon = await getPropsIcon();
  // Use default if no props and allows default
  if (!pageIcon && useDefaultIcon) {
    console.info(`#${pluginId}: Using default icon`)
    pageIcon = await chooseDefaultIcon();
  }
  console.info(`#${pluginId}: icon - ${pageIcon}`)
  return pageIcon;
}

// Set icon CSS variable
const renderIcon = async () => {
  const pageIcon = await getIcon();
  if (pageIcon) {
    body.classList.add("is-icon-active");
    root.style.setProperty("--pageIcon", `"${pageIcon}"`);
  } else {
    body.classList.remove("is-icon-active");
    root.style.setProperty("--pageIcon", "");
  }
}

// Default page or journal banner?
const chooseDefaultBanner = () => {
  console.info(`#${pluginId}: Using default banner`)
  return isJournal ? defaultJournalBanner : defaultPageBanner;
}

// Read banner from page props
const getPropsBanner = async () => {
  let propsBanner = "";
  //@ts-expect-error
  propsBanner = currentPageProps?.banner;
  if (propsBanner) {
    console.info(`#${pluginId}: banner props exists`)
    //remove surrounding quotations if present
    propsBanner = propsBanner.replace(/^"(.*)"$/, '$1');
    // if local image from assets folder
    if (propsBanner.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      propsBanner = "file://" + graphPath + propsBanner.replace("..", "")
    }
    console.info(`#${pluginId}: banner - ${propsBanner}`)
  }
  return propsBanner;
}

// Get banner
const getBanner = async () => {
  // Using journal default banner, home page
  if (pageType === "home" && useDefaultBanner) {
    console.info(`#${pluginId}: Using journal default banner, home page`)
    return defaultJournalBanner;
  }
  // Read from page props
  const pageBanner = await getPropsBanner();
  // Use default if no props and allows default
  if (!pageBanner && useDefaultBanner) {
    return chooseDefaultBanner();
  }
  return pageBanner;
}

// Set banner CSS variable
const renderBanner = async () => {
  const pageBanner = await getBanner();
  if (pageBanner) {
    renderIcon();
    body.classList.add("is-banner-active");
    root.style.setProperty("--pageBanner", `url(${pageBanner})`);
  } else {
    body.classList.remove("is-banner-active");
    root.style.setProperty("--pageBanner", "");
  }
}


// Page props was edited
let pagePropsObserverConfig: MutationObserverInit,
  pagePropsObserver: MutationObserver;
const pagePropsObserverInit = () => {
  pagePropsObserverConfig = {
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
    subtree: true
  }
  const pagePropsCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
      // @ts-expect-error
      if (mutationsList[i].target?.offsetParent?.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper") {
        console.info(`#${pluginId}: page props edited`)
        render();
      }
    }
  }
  pagePropsObserver = new MutationObserver(pagePropsCallback);
}

const pagePropsObserverRun = () => {
  const content = top?.document.getElementById("main-content-container")?.getElementsByClassName("blocks-container")[0] as Node;
  pagePropsObserver.observe(content, pagePropsObserverConfig);
}
const pagePropsObserverStop = () => {
  pagePropsObserver.disconnect();
}


// On Logseq ready - MAIN
const main = async () => {
  console.info(`#${pluginId}: MAIN`);
  logseq.useSettingsSchema(settingsArray);
  root = top!.document.documentElement;
  body = top!.document.body;

  readPluginSettings();
  initStyles();
  setTimeout(() => {
    render();
  }, 100)

  // Listeners
  setTimeout(() => {
    // Listen page props edit
    pagePropsObserverInit();
    pagePropsObserverRun();
    // Listen for pages switch
    logseq.App.onRouteChanged(async () => {
      pagePropsObserverStop();
      pagePropsObserverRun();
      setTimeout(() => {
        render();
      }, 100)
    })
    // Listen setting update
    logseq.onSettingsChanged(() => {
      readPluginSettings();
      root.style.setProperty("--bannerHeight", `${bannerHeight}`);
      render();
    })
  }, 2000);

}

logseq.ready(main).catch(console.error);
