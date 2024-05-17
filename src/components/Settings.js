import React from "react"
import settingsStore from "../stores/settings-store.js"
const h = React.createElement;


function Settings(props){
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    return h("div", props, 
        h("header", null, "Settings"),
        h("section", null, 
            h("header", null, "svgDisplay"),
            h("label", null, h("input", {
                type: "checkbox",
                checked: settings.svgDisplay.shapes,
                onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
            }), "show svg shapes")
        ),
        h("section", null, 
        h("header", null, "glDisplay"),
        h("label", null, h("input", {
            type: "checkbox",
            checked: settings.glDisplay.normals,
            onChange: (e)=>{settingsStore.update("glDisplay.normals", e.target.checked)}
        }), "show gl normals")
    )
    )
}

export default Settings;