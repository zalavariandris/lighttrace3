import React from "react"
import settingsStore from "../stores/settings-store.js"
import statsStore from "../stores/stats-store.js"
const h = React.createElement;

function AttributeEditor({attributes, onChange})
{
    return h("form", null, 
        Object.entries(attributes).map(([key, properties])=>{
            return h("label", null, 
                h("input", {...properties}),
                `${key}`
            )
        })
    )
}

function Settings(props){
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
    const stats = React.useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);

    return h("div", props, 
        h("header", null, "Settings"),
        h("section", null,
            h("header", null, "Raytrace"),
            h("form", null, 
                h("label", null, "lightSamples", h("input", {
                    type: "range", 
                    value: settings.raytrace.lightSamples, 
                    min: 2*2, 
                    max:128**2,
                    onChange: e=>settingsStore.setValue("raytrace.lightSamples", parseInt(e.target.value))
                }), `${settings.raytrace.lightSamples}`),
                h("label", null, "maxBounce", h("input", {type: 
                    "range", 
                    value: settings.raytrace.maxBounce, 
                    min: 1, 
                    max:16,
                    onChange: e=>settingsStore.setValue("raytrace.maxBounce", parseInt(e.target.value))
                }), `${settings.raytrace.maxBounce}`),
                h("label", null, `samples`, h("progress", {
                    value: stats.samplesCount/settings.raytrace.finishSamplesCount
                }), `samples: ${stats.samplesCount}`),
                h("label", null, "downres", h("input", {
                    type: "number", 
                    value: settings.raytrace.downres, 
                    min:1, 
                    max:8,
                    onChange: e=>settingsStore.setValue("raytrace.downres", parseInt(e.target.value))
                })),
            )
        ),
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