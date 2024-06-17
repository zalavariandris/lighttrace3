import React from "react";
import _ from "lodash";
import entityStore from "../stores/entity-store.js"
import settingsStore from "../stores/settings-store.js";
import uiStore from "../stores/ui-store.js";
import Icon from "../UI/Icon.js"


const h = React.createElement;

function SettingsToolbar({

}){
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    return h("div", {
        className:"toolbar horizontal",
    },
        h("button", { 
            onClick: e=>uiStore.setValue("page", "default")
        },
        h(Icon, {
            icon:"circle-left"
        }),
    ),

        h("label", null,
            h("input",{
                type: "range",
                min:1, max:9, step:1,
                value: settings.raytrace.maxBounce,
                onChange: e=>settingsStore.setValue(`raytrace.maxBounce`, parseInt(e.target.value))
            }),
            h("span", {style:{whiteSpace:"nowrap"}}, `bounce: ${settings.raytrace.maxBounce}`)
        ),

        h("label", null,
            h("input",{
                type: "range",
                min:1, max:15, step:1,
                value: Math.log2(settings.raytrace.lightSamples),
                onChange: e=>settingsStore.setValue(`raytrace.lightSamples`, Math.pow(2,e.target.value))
            }),
            h("span", {style:{whiteSpace:"nowrap"}}, `samples: ${settings.raytrace.lightSamples}`)
        ),

        h("label", null,
            h("input",{
                type: "range",
                min: 1, max:100, step:1,
                value: settings.raytrace.targetPasses,
                onChange: e=>settingsStore.setValue(`raytrace.targetPasses`, e.target.value)
            }),
            h("span", {style:{whiteSpace:"nowrap"}}, `target passes: ${settings.raytrace.targetPasses}`)
        ),

        // h("label", null,
        //     h("input",{
        //         type: "checkbox",
        //         checked: settings.display.render,
        //         onChange: (e)=>{
        //             settingsStore.setValue("display.render", e.target.checked);
        //             settingsStore.setValue("display.rays", !e.target.checked);
        //         }
        //     }),
        //     h("span", {style:{whiteSpace:"nowrap"}}, `WebGL render`)
        // ),

        // h("label", null,
        //     h("div", {style: {display: "flex", gap:"0.5rem"}},
        //         h("label", null,
        //             h("input",{
        //                 type: "radio",
        //                 checked: settings.display.render,
        //                 onChange: (e)=>{
        //                     settingsStore.setValue("display.render", e.target.checked);
        //                     settingsStore.setValue("display.rays", !e.target.checked);
        //                 }
        //             }), 
        //             // "WebGL"
        //         ),
        //         h("label", null,
        //             h("input",{
        //                 type: "radio",
        //                 checked: !settings.display.render,
        //                 onChange: (e)=>{
        //                     settingsStore.setValue("display.render", !e.target.checked);
        //                     settingsStore.setValue("display.rays", e.target.checked);
        //                 }
        //             }), 
        //             // "SVG"
        //         )
        //     ),
        //     h("span", {style:{whiteSpace:"nowrap"}}, `WebGL/SVG`)
        // ),

        h("label", null,
            h("input",{
                type: "checkbox",
                checked: settings.debug,
                onChange: (e)=>{
                    settingsStore.setValue("debug", e.target.checked);
                }
            }),
            h("span", {style:{whiteSpace:"nowrap"}}, `debug`)
        )
    );
}

function CreateToolbar({}){
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);
    return h("div", {
        className: "toolbar horizontal"
    },
        h("button", { 
            className: uiState.activeMouseTool?false:true ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", null)
        }, 
            h(Icon, {icon: "cursor"}),
            "select"
        ),

        h("hr"),

        h("button", {
            className: uiState.activeMouseTool=="circle" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
        }, 
            h(Icon, {icon: "circle"}),
            h("span", null, "circle")
        ),

        h("button", { 
            className: uiState.activeMouseTool=="rectangle" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
        },
            h(Icon, {icon: "square"}),
            "rectangle"
        ),

        h("button", { 
            className: uiState.activeMouseTool=="triangle" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
        },
            h(Icon, {icon: "triangle"}),
            "triangle"
        ),

        h("button", { 
            className: uiState.activeMouseTool=="lens" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
        },
            h(Icon, {icon: "lens"}),
            "lens"
        ),

        h("button", { 
            className: uiState.activeMouseTool=="line" ? "active" : "",
            label:"create line",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "line")
        },
            h(Icon, {icon: "line"}),
            "line"
        ),

        h("hr"),

        h("button", { 
            className: uiState.activeMouseTool=="pointLight" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
        },
            h(Icon, {icon: "lightbulb"}),
            "pointlight"
        ),
        h("button", { 
            className: uiState.activeMouseTool=="laser" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
        },
            h(Icon, {icon: "laser"}),
            "laser"
        ),
        h("button", {
            className: uiState.activeMouseTool=="directional" ? "active" : "",
            onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
        },
            h(Icon, {icon: "sun"}),
            "directional"
        ),

        h("hr"),

        h("button", {
            onMouseDown: (e)=>{uiStore.setValue("page", "settings")}
        },
            h(Icon, {icon: "cog"}),
            "settings"
        )
    )
}

function EditToolbar({})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const [selectedKey, selectedObject] = _.first(Object.entries(scene).filter(([key, entity])=>entity.selected));
    if(selectedObject.hasOwnProperty("shape")){
        return h("div", {
            className:"toolbar horizontal",
            style:{
                // textAlign: "center",
                display: "flex",
                alignItems: "center"
            }
        },
            h("label", {style: {display: "flex", flexDirection:"column", alignItems: "center"}},
                h(Icon, {
                    icon:"material"
                }),
                h("select", {className: "", name: "materials", onChange: (e)=>entityStore.setValue(`${selectedKey}.material.type`, e.target.value)}, 
                    h("option", {value: "mirror", selected: selectedObject.material.type=="mirror"}, "mirror"),
                    h("option", {value: "diffuse", selected: selectedObject.material.type=="diffuse"}, "diffuse"),
                    h("option", {value: "glass", selected: selectedObject.material.type=="glass"}, "glass")
                )
            ),
            
            h("hr"),
    
            h("button", { 
                className: 'danger',
                icon: "trash",
                onClick: e=>{
                    entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                }
            }, 
                h(Icon, {icon: "trash"}),
                "trash"
            )
        )
    }
    if(selectedObject.hasOwnProperty("light")){
        return h("div", {
            className:"toolbar horizontal",
            style:{
                textAlign: "center",
                display: "flex",
                alignItems: "center"
            }
        },
    
            h("label", null,
                h("input",{
                    type: "range",
                    min:0.1, max:10.0, step: 0.1,
                    value: selectedObject.light.intensity,
                    onChange: e=>entityStore.setValue(`${selectedKey}.light.intensity`, e.target.value)
                }),
                h("span", {style:{whiteSpace:"nowrap"}}, `${selectedObject.light.intensity} lm`)
            ),
    
            h("label", null,
                h("input",{
                    type: "range",
                    min:1000, max:10000, step:100,
                    value: selectedObject.light.temperature,
                    onChange: e=>entityStore.setValue(`${selectedKey}.light.temperature`, e.target.value)
                }),
                h("span", {style:{whiteSpace:"nowrap"}}, `${selectedObject.light.temperature} K`)
            ),
    
            h("hr"),
    
            h("button", { 
                className: 'danger',
                onClick: e=>{
                    entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                }
            }, 
                h(Icon, {icon: "trash"}),
                "trash"
            )
        )
    }
}

function Toolbar({...props})
{
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    React.useEffect(()=>{
        uiStore.setValue("page", "default")
    }, [scene])

    if(uiState.page=="settings")
    {
        return h(SettingsToolbar, null);
    }
    else
    {
        const AnySelected =  Object.values(scene).filter(entity=>entity.selected).length>0;
        if(AnySelected)
        {
            return h(EditToolbar)
        }else{
            return h(CreateToolbar)
        }
    }
    

}

export default Toolbar;