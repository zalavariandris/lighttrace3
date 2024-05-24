import React from "react"
import settingsStore from "../stores/settings-store.js"
import statsStore from "../stores/stats-store.js"
const h = React.createElement;

import {Input, Slider, Spinner, InputGroup, Group, Checkbox} from "../UI/widgets.js"
import { AttributeList, AttributeSection, AttributeRow } from "../UI/AttributeList.js";




function Progress()
{

}

function AttributeHeaderRow({...props}){
    return ("tr", null, 
        h("h2", null, props.children)
    )
}

function Settings(props){
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
    const stats = React.useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);

    return h("div", props, 
        h("h1", null, "Settings"),

        h(AttributeList, {className: "attributeTable"}, 
            h(AttributeSection, null,
                h(AttributeHeaderRow, null,
                    "Raytrace"
                ),
                h(AttributeRow, null,
                    h("label", {}, "lightSamples"), 
                    h(InputGroup, null,
                        h(Spinner, { 
                            style: {
                                width: "4rem"
                            },
                            value: settings.raytrace.lightSamples, 
                            min: 2*2, 
                            max:128**2,
                            onChange: e=>settingsStore.setValue("raytrace.lightSamples", parseInt(e.target.value))
                        }),
                        h(Slider, { 
                            value: settings.raytrace.lightSamples, 
                            min: 2*2, 
                            max:128**2,
                            onChange: e=>settingsStore.setValue("raytrace.lightSamples", parseInt(e.target.value))
                        })
                    )
                ),
                
                h(AttributeRow, null,
                    h("label", null, "maxBounce"),
                    h(InputGroup, null, 
                        h("input", {
                            type: 
                            "range", 
                            value: settings.raytrace.maxBounce, 
                            min: 1, 
                            max:16,
                            onChange: e=>settingsStore.setValue("raytrace.maxBounce", parseInt(e.target.value))
                        })
                    )
                ),

                h(AttributeRow, null,
                    h("label", null, `samples`),
                    h("progress", {
                        value: stats.samplesCount/settings.raytrace.finishSamplesCount
                    })
                ),

                h(AttributeRow, null, 
                    h("label", null, "downres"),
                    h("input", {
                        type: "number", 
                        value: settings.raytrace.downres, 
                        min:1, 
                        max:8,
                        onChange: e=>settingsStore.setValue("raytrace.downres", parseInt(e.target.value))
                    })
                )
            ),

            h(AttributeSection, null,

                h(AttributeHeaderRow, null,
                    "Display"
                ),

                h(AttributeRow, null, 
                    h("label", null, "shapes"),
                    h(Checkbox, {
                        label: "shapes",
                        checked: settings.svgDisplay.shapes,
                        onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
                    }),
                ),

                h(AttributeRow, null, 
                    h("label", null, "rays"),
                    h(Checkbox, {
                        label: "rays",
                        checked: settings.svgDisplay.shapes,
                        onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
                    })
                ),
                
                h(AttributeRow, null, 
                    h("label", null, "normals"),
                    h(Checkbox, {
                        label: "normals",
                        checked: settings.svgDisplay.shapes,
                        onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
                    })
                ),
                
                h(AttributeRow, null, 
                    h("label", null, "debug gl"),
                    h(Checkbox, {
                        label: "debug gl",
                        checked: settings.svgDisplay.shapes,
                        onChange: (e)=>{settingsStore.update("svgDisplay.shapes", e.target.checked)}
                    })
                ),
            )
        )
    )
}

export default Settings;