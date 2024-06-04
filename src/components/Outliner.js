import entityStore from "../stores/entity-store.js"
import React from "react";
import Icon from "../UI/Icon.js"
import ListView, {ListItem} from "../UI/ListView.js"
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

    /* could be a multiselect widget with auto height.
    support for hiearchies */
    return h("ul", {
        className: "outliner",
        ...props
    },
        Object.entries(scene).map( ([key, entity])=>{
            return h("li", {
                className: entity.selected?"active":""
            }, 
                h("a", {
                    href: "#",
                    onMouseDown: e=>{
                        e.preventDefault();
                        entityStore.setSelection([key]);
                    }
                }, 
                    h(Icon, {icon: getIcon(entity)}),
                    h("span", null, ` ${key}`)
                )
            )
        })
    )
    // return h(ListView, {...props}, 
    //     Object.entries(scene)
    //         .map( ([key, entity])=>{
    //             return h(ListItem, {
    //                 onMouseDown: e=>entityStore.setSelection([key]),
    //                 active: entity.selected
    //             }, 
    //                 h(Icon, {icon: getIcon(entity)}),
    //                 h("span", null, ` ${key}`)
    //             )
    //     })
    // );
}
export default Outliner;
