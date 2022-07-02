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
  defaultJournalIcon: string,
  timeout: number;

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
  },
  {
    key: "timeout",
    title: "Banner render timeout",
    type: "number",
    description: "If your Logseq pages too slow and render glitches - try set bigger value...500, 1000, 1500 (milliseconds). Caution! Banners will render slower (but morre stable)!",
    default: "100",
  }
]

const initStyles = () => {
  root.style.setProperty("--bannerHeight", `${bannerHeight}`);

  logseq.provideStyle(`
    body:is([data-page="page"],[data-page="home"]).is-banner-active #main-content-container {
      flex-wrap: wrap;
      align-content: flex-start;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active .cp__sidebar-main-content {
      flex-basis: 100%;
    }
    body:is([data-page="page"],[data-page="home"]) .content {
      position: relative;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active #main-content-container::before {
      content: "";
      width: 100%;
      height: var(--bannerHeight);
      background-image: var(--pageBanner);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: 50%;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .journal-item:first-of-type > .page > .flex-col > .content > .flex-1::before,
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .page > .relative > .flex-row > .flex-1::before {
      display: block;
      content: " ";
      padding-top: 50px;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .journal-item:first-of-type > .page > .flex-col > .content > .flex-1::after,
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .page > .relative > .flex-row > .flex-1::after {
      content: var(--pageIcon);
      font-size: 50px;
      font-weight: normal;
      position: absolute;
      top: -30px;
      left: -7px;
      line-height: initial;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-child {
      margin-top: 0;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item h1.title::before {
      content: "${defaultJournalIcon}";
      margin-right: 8px;
      font-size: 0.9em;
      font-weight: normal;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-of-type h1.title::before {
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
      defaultJournalIcon,
      timeout
    } = pluginSettings);
  }
  if (useDefaultBanner) {
    encodeDefaultBanners();
  }
}

// Render
const render = async () => {
  // "Delete" icon on ever render start if no default allowed
  if (!useDefaultIcon) {
    clearIcon();
  }
  // "Delete" banner on ever render start if no default allowed
  if (!useDefaultBanner) {
    clearBanner();
  }
  pageType = getPageType();
  if (!isPageTypeOk()) {
    clearIcon();
    clearBanner();
    return;
  }
  console.info(`#${pluginId}: page type - ${pageType}`)
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
    clearIcon();
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
    clearBanner();
  }
}

// Page props was edited
let propsChangedObserverConfig: MutationObserverInit,
  propsChangedObserver: MutationObserver;
const propsChangedObserverInit = () => {
  propsChangedObserverConfig = {
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
    subtree: true
  }
  const propsChangedCallback: MutationCallback = function (mutationsList) {
    console.info(`#${pluginId}: mutation`, mutationsList);
    for (let i = 0; i < mutationsList.length; i++) {
      if (mutationsList[i].oldValue?.includes("pre-block")){
        console.info(`#${pluginId}: page props - deleted`);
        render();
        return;
      }
      //@ts-expect-error
      if (mutationsList[i]?.target?.offsetParent.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
        console.info(`#${pluginId}: page props - edited or added`);
        render();
      }
    }
  }
  propsChangedObserver = new MutationObserver(propsChangedCallback);
}
const propsChangedObserverRun = () => {
  const preBlock = top?.document.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    console.info(`#${pluginId}: preBlock`, preBlock);
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
}

// Hide banner element
const clearBanner = () => {
  body.classList.remove("is-banner-active");
  root.style.setProperty("--pageBanner", "");
}

// Hide icon element
const clearIcon = () => {
  body.classList.remove("is-icon-active");
  root.style.setProperty("--pageIcon", "");
}

// Page changed
const routeChangedCallback = () => {
  console.info(`#${pluginId}: page route changed`);
  // Content reloaded, so need reconnect props listeners
  propsChangedObserverStop();
  setTimeout(() => {
    propsChangedObserverRun();
    // Rerender banner
    render();
  }, timeout)
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
  }, timeout*2)

  // Listeners late run
  propsChangedObserverInit();
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();

    // Listen for pages switch
    logseq.App.onRouteChanged(async () => {
      routeChangedCallback();
    })

    // Listen settings update
    logseq.onSettingsChanged(() => {
      readPluginSettings();
      root.style.setProperty("--bannerHeight", `${bannerHeight}`);
      render();
    })
  }, 4000);

}

logseq.ready(main).catch(console.error);
