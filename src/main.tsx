import "@logseq/libs";
import "virtual:windi.css";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);


const pluginId = PL.id;

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "bannerImage",
    title: "Banner Image",
    type: "string",
    description: "URL of the default banner image",
    default: "https://img.freepik.com/free-vector/winter-landscape-mountains-mid-century-modern-minimalist-art-print-abstract-mountain-contemporary-aesthetic-backgrounds-landscapes-vector-illustrations_69626-620.jpg?width=2000",
  },
]
function main() {
  logseq.provideStyle(`
  #main-content-container {
    flex-wrap: wrap;
}
  .cp__sidebar-main-content {
    transform: translateY(-30px);
}
`)
  console.info(`#${pluginId}: MAIN`);
  const root = ReactDOM.createRoot(document.getElementById("app")!);
  addImage()
  logseq.useSettingsSchema(settingsArray)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  logseq.App.onRouteChanged(() => {
    addImage()
    // }
  })


  async function addImage() {
    const icon = (await logseq.Editor.getCurrentPage())?.properties?.pageIcon;
    const bannerLink = (await logseq.Editor.getCurrentPage())?.properties?.banner;
    console.log((await logseq.Editor.getCurrentPage())?.properties)
    top?.document.getElementById("bannerImage")?.remove()
    setTimeout(() => {
      const contentContainer = top?.document.getElementsByClassName("cp__sidebar-main-content")[0]

      if (top?.document.getElementById("bannerImage") == null) {
        let pageTitle = top?.document.getElementsByClassName("page-title")[0]
        //if page title is null then get element by class name of journal-title
        if (pageTitle == null) {
          pageTitle = top?.document.getElementsByClassName("journal-title")[0]
        }
        // @ts-expect-error
        const bannerImage = top.document.createElement("img")
        bannerImage.id = "bannerImage"
        //remove surrounding quotations if present
        bannerImage.src = (bannerLink
          ?? logseq.settings?.bannerImage
          ?? 'https://img.freepik.com/free-vector/winter-landscape-mountains-mid-century-modern-minimalist-art-print-abstract-mountain-contemporary-aesthetic-backgrounds-landscapes-vector-illustrations_69626-620.jpg?width=2000')
          .replace(/^"(.*)"$/, '$1');
        bannerImage.style.flexBasis = "100%"
        bannerImage.style.maxHeight = "300px"
        bannerImage.style.objectFit = "cover"
        top?.document.getElementById("main-content-container")?.insertBefore(bannerImage, contentContainer)

        console.log("hi")
        // @ts-expect-error
        const iconImage = top.document.createElement("label")


        iconImage.innerText = icon ?? "📆"
        iconImage.id = "helloIcon"
        iconImage.style.fontSize = "50px"
        iconImage.style.flexBasis = "100%"
        iconImage.style.transform = "translate(100px, -30px)"

        // @ts-expect-error
        pageTitle.insertBefore(iconImage, pageTitle?.childNodes[0])
        // iconImage.src = "https://img.freepik.com/free-vector/winter-landscape-mountains-mid-century-modern-minimalist-art-print-abstract-mountain-contemporary-aesthetic-backgrounds-landscapes-vector-illustrations_69626-620.jpg"

      }
    }, 100)
  }

  function createModel() {
    return {
      show() {
        // logseq.showMainUI();
        // addImage()
      },
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  });

  const openIconName = "template-plugin-open";

  logseq.provideStyle(css`
    .${openIconName} {
      opacity: 0.55;
      font-size: 20px;
      margin-top: 4px;
    }

    .${openIconName}:hover {
      opacity: 0.9;
    }
  `);

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
      <div data-on-click="show" class="${openIconName}">⚙️</div>
    `,
  });
}

logseq.ready(main).catch(console.error);
