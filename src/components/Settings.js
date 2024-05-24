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

function Group({title, ...props})
{
    return h("section", {
        className:"group",
        style: {
            display: "grid",
            gridTemplateColumns: "auto auto",
            gap: "0 1rem"
        }
    },
        h("h3", {
            style: {
                gridColumn: "1 / -1"
            }
        }, `${title}`),

        props.children
    )
}

function Slider({value, onChange, min, max})
{
    return h("input", {
        type: "range", 
        value, 
        min, 
        max,
        onChange
    });
}

function Progress()
{

}

function Checkbox({checked, onChange, label}={})
{

    return h("label", null, 
        h("input", {
            type: "checkbox",
            checked,
            onChange
        }),
        `${label}`
    );
}

function Settings(props){
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
    const stats = React.useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);

    return h("div", props, 
        h("h2", null, "Settings"),

        h(Group, {title: "Raytrace"},
            h("label", null, "lightSamples"), 
            h(Slider, { 
                value: settings.raytrace.lightSamples, 
                min: 2*2, 
                max:128**2,
                onChange: e=>settingsStore.setValue("raytrace.lightSamples", parseInt(e.target.value))
            }),

            h("label", null, "maxBounce"),
            h("input", {
                type: 
                "range", 
                value: settings.raytrace.maxBounce, 
                min: 1, 
                max:16,
                onChange: e=>settingsStore.setValue("raytrace.maxBounce", parseInt(e.target.value))
            }),

            h("label", null, `samples`),
            h("progress", {
                value: stats.samplesCount/settings.raytrace.finishSamplesCount
            }),

            h("label", null, "downres"),
            h("input", {
                type: "number", 
                value: settings.raytrace.downres, 
                min:1, 
                max:8,
                onChange: e=>settingsStore.setValue("raytrace.downres", parseInt(e.target.value))
            })
        ),
        h(Group, {title: "Display"}, 

            h("label", null, "shapes"),
            h(Checkbox, {
                label: "shapes",
                checked: settings.svgDisplay.shapes,
                onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
            }),

            h("label", null, "rays"),
            h(Checkbox, {
                label: "rays",
                checked: settings.svgDisplay.shapes,
                onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
            }),

            h("label", null, "normals"),
            h(Checkbox, {
                label: "normals",
                checked: settings.svgDisplay.shapes,
                onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
            }),

            h("label", null, "debug gl"),
            h(Checkbox, {
                label: "debug gl",
                checked: settings.svgDisplay.shapes,
                onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
            })
        )
    )
}

export default Settings;