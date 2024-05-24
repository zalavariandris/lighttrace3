import entityStore from "../stores/entity-store.js"
import React from "react";
import Icon from "./Icon.js"

const h = React.createElement;

function Outliner(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);

    const getIcon = (entity)=>{
        if(entity.hasOwnProperty("shape"))
        {
            switch (entity.shape.type) {
                case "circle":
                    return "circle"
                case "rectangle":
                    return "rectangle"
                case "triangle":
                    return "triangle"
                case "line":
                    return "line"
                case "sphericalLens":
                    return "lens"
                default:
                    return "";
            }
        }else if(entity.hasOwnProperty("light"))
        {
            switch (entity.light.type) {
                case "laser":
                    return "laser"
                case "directional":
                    return "sun"
                case "laser":
                    return "lightbulb"
            
                default:
                    return ""
            }
        }
    }

    return h("ul", {className: "list-group",...props}, 
        Object.entries(scene)
            .map( ([key, entity])=>{
                return h("button", {
                    onMouseDown: e=>entityStore.setSelection([key]),
                    className:  entity.selected ? "list-group-item list-group-item-action active" : "list-group-item list-group-item-action"
                }, 
                    h(Icon, {icon: getIcon(entity)}),
                    h("span", null, ` ${key}`)
                )
        })
    );
}
export default Outliner;
