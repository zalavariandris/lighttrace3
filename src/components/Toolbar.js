import React from "react";
import _ from "lodash";
import entityStore from "../stores/entity-store.js"
import settingsStore from "../stores/settings-store.js";
import uiStore from "../stores/ui-store.js";
import {CButton, CButtonGroup} from "@coreui/react" 
import Icon from "../UI/Icon.js"
import Button from "../UI/Button.js"

const h = React.createElement;

function SettingsToolbar({}){
    


}

function Toolbar({...props})
{
    const [showSettings, setShowSettings] = React.useState(false);
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    React.useEffect(()=>{
        setShowSettings(false);
    }, [scene])

    if(showSettings)
    {
        return h("div", {
            className:"toolbar horizontal",
            style:{
                textAlign: "center",
                display: "flex",
                alignItems: "center"
            }
        },
            h(Button, { 
                color: 'danger',
                icon: "circle-left",
                onClick: e=>setShowSettings(false)
            }),

            h("label", null,
                h("input",{
                    type: "range",
                    min:1, max:9, step:1,
                    value: settings.raytrace.maxBounce,
                    onChange: e=>settingsStore.setValue(`raytrace.maxBounce`, e.target.value)
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
                    type: "checkbox",
                    checked: settings.display.render,
                    onChange: (e)=>{
                        settingsStore.setValue("display.render", e.target.checked);
                        settingsStore.setValue("display.rays", !e.target.checked);
                    }
                }),
                h("span", {style:{whiteSpace:"nowrap"}}, `weblg render`)
            )
        );
    }else{
        const AnySelected =  Object.values(scene).filter(entity=>entity.selected).length>0;
        if(AnySelected)
        {
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
            
                    h(Button, { 
                        color: 'danger',
                        icon: "trash",
                        onClick: e=>{
                            entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                        }
                    }, 
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
            
                    h(Button, { 
                        color: 'danger',
                        icon: "trash",
                        onClick: e=>{
                            entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                        }
                    }, 
                        "trash"
                    )
                )
            }
        }else{
            return h("div", {
                id: "hello3",
                style:{
                    // textAlign: "center",
                    display: "flex",
                    alignItems: "center"
                }
            },
                h(Button, { 
                    tooltip: "select and move tool",
                    active: uiState.activeMouseTool?false:true,
                    onClick: (e)=>uiStore.setValue("activeMouseTool", null)
                }, 
                    h(Icon, {icon: "cursor"}),
                    "select"
                ),
        
                h("hr"),
        
                h(Button, {
                    active: uiState.activeMouseTool=="circle",
                    icon: "circle",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
                }, 
                    h("span", null, "circle")
                ),
        
                h(Button, { 
                    active: uiState.activeMouseTool=="rectangle",
                    icon: "square",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
                },
                    "rectangle"
                ),
        
                h(Button, { 
                    active: uiState.activeMouseTool=="triangle",
                    icon: "triangle",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
                },
                    "triangle"
                ),
        
                h(Button, { 
                    active: uiState.activeMouseTool=="lens",
                    icon: "lens",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
                },
                    "lens"
                ),
        
                h(Button, { 
                    active: uiState.activeMouseTool=="line",
                    icon: "line",
                    label:"create line",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "line")
                },
                    "line"
                ),
        
                h("hr"),
        
                h(Button, { 
                    active: uiState.activeMouseTool=="pointLight",
                    icon: "lightbulb",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
                },
                    "pointlight"
                ),
                h(Button, { 
                    active: uiState.activeMouseTool=="laser",
                    icon: "laser",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
                },
                    "laser"
                ),
                h(Button, { 
                    active: uiState.activeMouseTool=="directional",
                    icon: "sun",
                    onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
                },
                    "directional"
                ),
        
                h("hr"),
        
                h(Button, { 
                    icon: "cog",
                    label:"settings",
                    onMouseDown: (e)=>{setShowSettings(true)}
                },
                    "settings"
                )
            )
        }
    }
    

}

export default Toolbar;