import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

import mainStyles from "./main.css?raw";

type AssetDataList = {
  [prop: string]: AssetData;
}

type AssetData = {
  banner?: string;
  bannerHeight?: string;
  bannerAlign?: string;
  pageIcon?: string;
  iconWidth?: string;
  icon?: string;
}

enum AssetType {
  banner = "banner",
  pageIcon = "pageIcon"
}

type WidgetsConfig = {
  onlyOnJournals: boolean;
  customHTML?: string;
  calendar?: any;
}

const pluginId = PL.id;

let doc: Document;
let root: HTMLElement;
let body: HTMLElement;

let isJournal: boolean;
let isHome: boolean;
let isPage: boolean;

let defaultConfig: AssetDataList;
let customPropsConfig: AssetDataList;
let widgetsConfig: WidgetsConfig;
let timeout: number;
let hidePluginProps: boolean;

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
// const settingsDefaultPageBanner = "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsWidgetsCustomHTML = `
<iframe id="banner-widgets-weather" src="https://indify.co/widgets/live/weather/7QOWaH4IPGGaAr4puql2"></iframe>
<iframe id="banner-widgets-pomo" src="https://pomofocus.io/app"></iframe>
`;

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "generalHeading",
    title: "General settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "hidePluginProps",
    title: "",
    type: "boolean",
    description: "Hide plugin-related page props? (will be shown only on edit)",
    default: "false",
  },
  {
    key: "widgetsHeading",
    title: "Widgets common settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsOnlyOnJournals",
    title: "",
    type: "boolean",
    description: "Show widgets only on home and journals pages?",
    default: true,
  },
  {
    key: "widgetsCustomHTML",
    title: "",
    type: "string",
    description: "Show custom HTML (iframe for ex.) as widget on home and journal pages",
    default: settingsWidgetsCustomHTML,
  },
  {
    key: "widgetsCalendarHeading",
    title: "Widget calendar settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsCalendarWidth",
    title: "Block calendar widget width (in px)",
    type: "string",
    description: "",
    default: "310px",
  },
  {
    key: "journalHeading",
    title: "Journal and home settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page",
    type: "string",
    description: "",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "journalBannerHeight",
    title: "Banner height for journal & home page",
    type: "string",
    description: "",
    default: "300px",
  },
  {
    key: "journalBannerAlign",
    title: "Default banner vertical align for journal and home page",
    type: "string",
    description: "",
    default: "50%"
  },
  {
    key: "defaultJournalIcon",
    title: "Default icon (emoji) for journal and home page",
    type: "string",
    description: "",
    default: "📅",
  },
  {
    key: "journalIconWidth",
    title: "Icon width for journal & home page (in px)",
    type: "string",
    description: "",
    default: "50px",
  },
  {
    key: "pageHeading",
    title: "Common page settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "defaultPageBanner",
    title: "Default banner for common page",
    type: "string",
    description: "",
    default: settingsDefaultPageBanner,
  },
  {
    key: "pageBannerHeight",
    title: "Banner height for common page",
    type: "string",
    description: "",
    default: "200px",
  },
  {
    key: "pageBannerAlign",
    title: "Default banner vertical align for common page",
    type: "string",
    description: "",
    default: "50%"
  },
  {
    key: "defaultPageIcon",
    title: "Default icon (emoji) for common page",
    type: "string",
    description: "",
    default: "📄",
  },
  {
    key: "pageIconWidth",
    title: "Icon width for common page (in px)",
    type: "string",
    description: "",
    default: "40px",
  },
  {
    key: "adwancedHeading",
    title: "Adwanced settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "customPropsConfig",
    title: "Advanced custom pages banners and icons config",
    type: "object",
    description: "",
    default: {
      "pageType": {
        "evrgrn": {
          "pageIcon": "🌳",
          "banner": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
        },
        "seed": {
          "pageIcon": "🌱",
          "banner": "https://images.unsplash.com/photo-1631949454967-6c6d07fb59cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
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
  logseq.provideStyle(mainStyles);
}

const initGlobalCSSVars = () => {
  initWidgetsCSSVars();
}

// Read settings
const readPluginSettings = () => {
  widgetsConfig = {
    calendar: {},
    onlyOnJournals: true
  };
  defaultConfig = {
    page: {},
    journal: {}
  }

  if (logseq.settings) {
    ({
      hidePluginProps,
      widgetsOnlyOnJournals: widgetsConfig.onlyOnJournals,
      widgetsCustomHTML: widgetsConfig.customHTML,
      widgetsCalendarWidth: widgetsConfig.calendar.width,
      defaultPageBanner: defaultConfig.page.banner,
      pageBannerHeight: defaultConfig.page.bannerHeight,
      pageBannerAlign: defaultConfig.page.bannerAlign,
      defaultPageIcon: defaultConfig.page.pageIcon,
      pageIconWidth: defaultConfig.page.iconWidth,
      defaultJournalBanner: defaultConfig.journal.banner,
      journalBannerHeight: defaultConfig.journal.bannerHeight,
      journalBannerAlign: defaultConfig.journal.bannerAlign,
      defaultJournalIcon: defaultConfig.journal.pageIcon,
      journalIconWidth: defaultConfig.journal.iconWidth,
      customPropsConfig,
      timeout
    } = logseq.settings);
  }
  encodeDefaultBanners();
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

// Get and encode default banners for caching
// skip caching if random image from Unsplash API used
const encodeDefaultBanners = async () => {
  if (defaultConfig.page.banner && !(defaultConfig.page.banner?.includes("source.unsplash.com"))) {
    defaultConfig.page.banner = await getBase64FromUrl(defaultConfig.page.banner);
  }
  if (defaultConfig.journal.banner && !(defaultConfig.journal.banner?.includes("source.unsplash.com"))) {
    defaultConfig.journal.banner = await getBase64FromUrl(defaultConfig.journal.banner);
  }
}

// Colors
function hexToRGB(h: string): string {
  let r = 0, g = 0, b = 0;
  //@ts-expect-error
  r = "0x" + h[1] + h[2];
  //@ts-expect-error
  g = "0x" + h[3] + h[4];
  //@ts-expect-error
  b = "0x" + h[5] + h[6];
  return +r + "," + +g + "," + +b;
}

// Bg colors magic
const setPrimaryColors = () => {
  const primaryTextcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-text-color').trim();
  root.style.setProperty("--widgetsTextColor", hexToRGB(primaryTextcolor));
  const primaryBgcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-background-color').trim();
  root.style.setProperty("--widgetsBgColor", hexToRGB(primaryBgcolor));

}


// Hide page props
const hidePageProps = () => {
  const propBlockKeys = doc.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      if (propBlockKeys[i].textContent === "banner" || propBlockKeys[i].textContent === "page-icon" || propBlockKeys[i].textContent === "icon") {
        propBlockKeys[i].parentElement!.parentElement!.style.display = hidePluginProps ? "none" : "block" ;
      }
    }
  }
}

// Get page type
const getPageType = () => {
  isPage = false;
  isHome = false;
  const pageType = body.getAttribute("data-page");
  if (pageType === "home") {
    isHome = true;
    isPage = false;
  }
  if (pageType === "page") {
    isPage = true;
    isHome = false;
  }
}

const getPageAssetsData = async (): Promise<AssetData> => {
  let pageAssetsData = defaultConfig.journal;
  let currentPageProps: any = {};
  // home = journal page?
  if (isHome) {
    console.info(`#${pluginId}: Homepage`);
    return pageAssetsData;
  }
  // journal page?
  const currentPageData = await getPageData();
  isJournal = currentPageData["journal?"];
  if (isJournal) {
    console.info(`#${pluginId}: Journal page`);
    return pageAssetsData;
  }
  // common page?
  console.info(`#${pluginId}: Trying page props`);
  currentPageProps = currentPageData.properties;
  if (currentPageProps) {
    // get custom config, override with high proirity page props
    const customAssetData = getCustomAssetData(currentPageProps);
    pageAssetsData = { ...defaultConfig.page, ...customAssetData, ...currentPageProps }
  } else {
    console.info(`#${pluginId}: Default page`);
    pageAssetsData = defaultConfig.page;
  }
  console.info(`#${pluginId}: pageAssetsData -- `, pageAssetsData);
  return pageAssetsData;
}

const getPageData = async (): Promise<any> => {
  let currentPageData = null;
  currentPageData = await logseq.Editor.getCurrentPage();
  if (currentPageData) {
    // Check if page is a child and get parent ID
   //@ts-expect-error
    const currentPageId = currentPageData.page?.id;
    if (currentPageId) {
      currentPageData = null;
      currentPageData = await logseq.Editor.getPage(currentPageId);
    }
  }
  return currentPageData;
}

// Read custom defaults config
const getCustomAssetData = (currentPageProps: any) => {
  console.info(`#${pluginId}: Trying custom JSON settings`);
  let customAssetData = {};
  for (const key of Object.keys(customPropsConfig)) {
    const pageCustomProp = currentPageProps?.[key];
    if (pageCustomProp) {
      const pageCustomPropValue = Array.isArray(pageCustomProp) ? pageCustomProp[0] : pageCustomProp;
      if (pageCustomPropValue) {
        //@ts-expect-error
        customAssetData = customPropsConfig?.[key]?.[pageCustomPropValue];
      }
    }
  }
  return customAssetData;
}

// Render banner
const renderBanner = async (pageAssetsData: AssetData) => {
  if (pageAssetsData.banner) {
    // Set banner CSS variable
    body.classList.add("is-banner-active");
    root.style.setProperty("--bannerHeight", `${pageAssetsData.bannerHeight}`);
    root.style.setProperty("--bannerAlign", `${pageAssetsData.bannerAlign}`);


    //remove surrounding quotations if present
    pageAssetsData.banner = pageAssetsData.banner.replace(/^"(.*)"$/, '$1');
    // if local image from assets folder
    if (pageAssetsData.banner.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      pageAssetsData.banner = encodeURI("assets://" + graphPath + pageAssetsData.banner.replace("..", ""));
    }
    root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);

    // render icon only if banner exists
    renderIcon(pageAssetsData);
  } else {
    // clear old banner
    clearBanner();
  }
}

// Render icon
const renderIcon = async (pageAssetsData: AssetData) => {
  const pageIcon = pageAssetsData.icon || pageAssetsData.pageIcon;
  if (pageIcon) {
    // Set icon CSS variable
    body.classList.add("is-icon-active");
    root.style.setProperty("--iconWidth", `${pageAssetsData.iconWidth}`);
    root.style.setProperty("--pageIcon", `"${pageIcon}"`);
  } else {
    // clear old icon
    clearIcon();
  }
}

// Hide banner element
const clearBanner = () => {
  body.classList.remove("is-banner-active");
  root.style.setProperty("--pageBanner", "");
  root.style.setProperty("--bannerHeight", "");
  root.style.setProperty("--bannerAlign", "");
}

// Hide icon element
const clearIcon = () => {
  body.classList.remove("is-icon-active");
  root.style.setProperty("--pageIcon", "");
  root.style.setProperty("--iconWidth", "");
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
      if (mutationsList[i]?.target?.offsetParent?.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
        console.info(`#${pluginId}: page props - edited or added`);
        render();
      }
    }
  }
  propsChangedObserver = new MutationObserver(propsChangedCallback);
}
const propsChangedObserverRun = () => {
  const preBlock = doc.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
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

// Setting changed
const onSettingsChangedCallback = () => {
  const oldWidgetsConfig = widgetsConfig;
  readPluginSettings();
  initGlobalCSSVars();
  render();
  renderWidgetsCustom(oldWidgetsConfig);
}

// Plugin unloaded
const onPluginUnloadCallback = () => {
  // clean up
  top!.document.getElementById("banner")?.remove();
}

// Color mode changed
const onThemeModeChangedCallback = () => {
  setTimeout(() => {
    setPrimaryColors();
  }, 100)
}

// Render placeholder
const renderPlaceholder = () => {
  // Widgets area
  if (!doc.getElementById("banner")) {
    const container = doc.getElementById("main-content-container");
    if (container) {
      container.setAttribute("style", "display:block;margin-left:auto;margin-right:auto;");
      container.insertAdjacentHTML(
        "afterbegin",
        `<div id="banner" style="position:relative;display:none;">
          <div id="banner-widgets">
            <div id="banner-widgets-calendar"></div>
            <div id="banner-widgets-custom"></div>
          </div>

        </div>`
      );
    }
  }
}

// Show placeholder
const showPlaceholder = () => {
  doc.getElementById("banner")!.style.display = "block";
}

// Hide placeholder
const hidePlaceholder = () => {
  doc.getElementById("banner")!.style.display = "none";
}

// Show widgets placeholder
const showWidgetsPlaceholder = () => {
  doc.getElementById("banner-widgets")!.style.display = "block";
}

// Hide widgets placeholder
const hideWidgetsPlaceholder = () => {
  doc.getElementById("banner-widgets")!.style.display = "none";
}

// Render custom widgets HTML
const renderWidgetsCustom = (oldWidgetsConfig?: WidgetsConfig) => {
  const bannerWidgetsCustom = doc.getElementById("banner-widgets-custom");
  if (bannerWidgetsCustom
    && (!oldWidgetsConfig || (oldWidgetsConfig && (oldWidgetsConfig.customHTML !== widgetsConfig.customHTML)))) {
      bannerWidgetsCustom.innerHTML = widgetsConfig.customHTML || "";
  }
}

const initWidgetsCSSVars = () => {
  setPrimaryColors();
  root.style.setProperty("--widgetsCalendarWidth", widgetsConfig.calendar.width);
}


// Render
const render = async () => {
  getPageType();

  if (!(isHome || isPage)) {
    hidePlaceholder();
    return;
  }

  hidePageProps();

  const pageAssetsData: AssetData = await getPageAssetsData();
  if (pageAssetsData) {
    if (widgetsConfig.onlyOnJournals) {
      if (!(isHome || isJournal)) {
        hideWidgetsPlaceholder();
      } else {
        showWidgetsPlaceholder();
      }
    }
    renderBanner(pageAssetsData);
    showPlaceholder();
  }
}

// On Logseq ready - MAIN
const main = async () => {
  console.info(`#${pluginId}: MAIN`);

  logseq.useSettingsSchema(settingsArray);
  doc = top!.document;
  root = doc.documentElement;
  body = doc.body;

  body.classList.add("is-banners-plugin-loaded");

  readPluginSettings();
  initStyles();
  initGlobalCSSVars();
  setTimeout(() => {
    renderPlaceholder();
    render();
    renderWidgetsCustom();
  }, timeout*2)

  // Listeners late run
  propsChangedObserverInit();

  // Secondary listeners
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();

    // Listen for pages switch
    logseq.App.onRouteChanged( async () => {
      routeChangedCallback();
    })

    // Listen settings update
    logseq.onSettingsChanged(() => {
      onSettingsChangedCallback();
    })

    // Listen plugin unload
    logseq.beforeunload( async () => {
      onPluginUnloadCallback();
    })

    // Listen for theme mode changed
    logseq.App.onThemeModeChanged( () => {
      onThemeModeChangedCallback();
    })

  }, 4000);

}

logseq.ready(main).catch(console.error);
