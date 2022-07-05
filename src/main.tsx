import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

const pluginId = PL.id;

let root: HTMLElement;
let body: HTMLElement;

interface IAssetsRecord {
  [prop: string]: IAssets;
}

interface IAssets {
  banner?: string;
  pageIcon?: string;
}

interface IUseDefault {
  banner?: boolean;
  pageIcon?: boolean;
}

let pageType: string;
let isJournal: boolean;
let currentPage;
//@ts-expect-error
let currentPageProps;
let bannerHeight: string;
const useDefault: IUseDefault = {};
const defaultConfig: IAssetsRecord = {
  "page": {
    "banner": "",
    "pageIcon": ""
  },
  "journal": {
    "banner": "",
    "pageIcon": ""
  }
};
let customPropsConfig: IAssetsRecord;
let timeout: number;
let hidePluginProps: boolean;

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsArray: SettingSchemaDesc[] = [
  {
    key: "hidePluginProps",
    title: "Hide plugin props",
    type: "boolean",
    description: "Show plugin props only on edit?",
    default: "false",
  },
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
    key: "customPropsConfig",
    title: "Custom props",
    type: "object",
    description: "Advanced custom page banners and icons config",
    default: {
      "pageType": {
        "evrgrn": {
          "pageIcon": "🌳",
          "banner": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
        },
        "seed": {
          "pageIcon": "🌱",
          "banner": "https://images.unsplash.com/photo-1631949454967-6c6d07fb59cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
        }
      },
      "anotherCamalCasedPropName": {}
    }
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
      content: var(--pageIcon);
      font-size: 50px;
      font-weight: normal;
      position: absolute;
      top: -40px;
      left: -7px;
      z-index:2;
      line-height: initial;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active :is(.ls-page-title, .page-title, .journal-title) {
      margin-top: 35px;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-child {
      margin-top: 0;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item h1.title::before {
      content: "${defaultConfig.journal.pageIcon}";
      margin-right: 8px;
      font-size: 0.9em;
      font-weight: normal;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-of-type h1.title::before {
      display: none;
    }
    .cp__right-sidebar-inner .resizer {z-index:9;}
  `)
}

// Read settings
const readPluginSettings = () => {
  const pluginSettings = logseq.settings;
  if (pluginSettings) {
    ({
      hidePluginProps,
      bannerHeight,
      useDefaultBanner: useDefault.banner,
      useDefaultIcon: useDefault.pageIcon,
      defaultPageBanner: defaultConfig.page.banner,
      defaultPageIcon: defaultConfig.page.pageIcon,
      defaultJournalBanner: defaultConfig.journal.banner,
      defaultJournalIcon: defaultConfig.journal.pageIcon,
      customPropsConfig,
      timeout
    } = pluginSettings);
  }
  if (useDefault.banner) {
    encodeDefaultBanners();
  }
}

// Hide props
const hideProps = () => {
  const propBlockKeys = top?.document.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      if (propBlockKeys[i].textContent === "banner" || propBlockKeys[i].textContent === "page-icon") {
        propBlockKeys[i].parentElement!.style.display = hidePluginProps ? "none" : "block" ;
      }
    }
  }
}

// Render
const render = async () => {
  // "Delete" icon on ever render start if no default allowed
  if (!useDefault.pageIcon) {
    clearIcon();
  }
  // "Delete" banner on ever render start if no default allowed
  if (!useDefault.banner) {
    clearBanner();
  }
  pageType = getPageType();
  if (!isPageTypeOk()) {
    clearIcon();
    clearBanner();
    return;
  }
  if (pageType !== "home") {
    currentPage = await logseq.Editor.getCurrentPage();
    if (currentPage) {
      //@ts-expect-error
      const currentPageId = currentPage.page?.id;
      if (currentPageId) {
        currentPage = await logseq.Editor.getPage(currentPageId);
      }
      if (currentPage) {
        isJournal = currentPage?.["journal?"];
        //@ts-expect-error
        currentPageProps = currentPage?.properties;
      }
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
  defaultConfig.page.banner = await getBase64FromUrl(defaultConfig.page.banner || settingsDefaultPageBanner);
  defaultConfig.journal.banner = await getBase64FromUrl(defaultConfig.journal.banner || settingsDefaultJournalBanner);
}

// Read from cusrom page props config
const getCustomPropsAsset = (assetType: string) => {
  console.info(`#${pluginId}: Trying custom ${assetType}`);
  let customPropsAsset = "";
  for (const key of Object.keys(customPropsConfig)) {
    //@ts-expect-error
    const pageCustomProp = currentPageProps?.[key];
    if (pageCustomProp) {
      const pageCustomPropValue = Array.isArray(pageCustomProp) ? pageCustomProp[0] : pageCustomProp;
      if (pageCustomPropValue) {
        //@ts-expect-error
        customPropsAsset = customPropsConfig?.[key]?.[pageCustomPropValue]?.[assetType];
      }
    }
  }
  return customPropsAsset;
}

// Read banner from page props
const getPropsAsset = async (assetType: string) => {
  console.info(`#${pluginId}: Trying props ${assetType}`);
  let propsAsset = "";
  //@ts-expect-error
  propsAsset = currentPageProps?.[assetType];
  if (propsAsset && assetType === "banner") {
    //remove surrounding quotations if present
    propsAsset = propsAsset.replace(/^"(.*)"$/, '$1');
    // if local image from assets folder
    if (propsAsset.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      propsAsset = encodeURI("assets://" + graphPath + propsAsset.replace("..", ""));
    }
  }
  return propsAsset;
}

// Check journals home page
const getHomeAsset = (assetType: string): string => {
  let homeAsset = "";
  //@ts-expect-error
  if (pageType === "home" && useDefault[assetType]) {
    console.info(`#${pluginId}: Using journal default ${assetType}, home page`);
    //@ts-expect-error
    homeAsset = defaultConfig.journal[assetType];
  }
  return homeAsset;
}

// Default page or journal banner?
const chooseDefaultAsset = (assetType: string) => {
  let defaultAsset = "";
  console.info(`#${pluginId}: Trying default ${assetType} for ${pageType}`);
  //@ts-expect-error
  defaultAsset = isJournal ? defaultConfig.journal[assetType] : defaultConfig.page[assetType];
  return defaultAsset;
}


// Get asset
const getAsset = async (assetType: string) => {
  let asset = "";
  // Check journals home page
  asset = getHomeAsset(assetType);
  if (asset) {
    return asset;
  }
  // Read from page props
  asset = await getPropsAsset(assetType);
  // Read from custom props
  if (!asset && customPropsConfig) {
    asset = getCustomPropsAsset(assetType);
  }
  // Use default if no props and allows default
  if (!asset && useDefault.pageIcon) {
    return chooseDefaultAsset(assetType);
  }
  console.info(`#${pluginId}: ${assetType} - ${asset}`);
  return asset;
}

// Set banner CSS variable
const renderBanner = async () => {
  const pageBanner = await getAsset("banner");
  if (pageBanner) {
    renderIcon();
    body.classList.add("is-banner-active");
    root.style.setProperty("--pageBanner", `url(${pageBanner})`);
  } else {
    clearBanner();
  }
}

// Set icon CSS variable
const renderIcon = async () => {
  const pageIcon = await getAsset("pageIcon");
  if (pageIcon) {
    body.classList.add("is-icon-active");
    root.style.setProperty("--pageIcon", `"${pageIcon}"`);
  } else {
    clearIcon();
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
  hideProps();
  propsChangedObserverStop();
  setTimeout(() => {
    propsChangedObserverRun();
    // Rerender banner
    render();
  }, timeout)
}

// Setting changed
const onSettingsChangedCallback = () => {
  readPluginSettings();
  root.style.setProperty("--bannerHeight", `${bannerHeight}`);
  render();
 }

// On Logseq ready - MAIN
const main = async () => {
  console.info(`#${pluginId}: MAIN`);
  logseq.useSettingsSchema(settingsArray);
  root = top!.document.documentElement;
  body = top!.document.body;

  readPluginSettings();
  initStyles();
  hideProps();
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
      onSettingsChangedCallback();
    })
  }, 4000);

}

logseq.ready(main).catch(console.error);
