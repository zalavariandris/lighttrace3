import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function PointLight({entityKey, entity})
{
    
    const cx = entity.transform.translate.x;
    const cy = entity.transform.translate.y;
    const angle = entity.transform.rotate;

    return h("g", {
        className: entity.selected ? "light selected" : "light",
        ...props
    }, 
        h(Manipulator, {
            referenceX: entity.transform.translate.x,
            referenceY: entity.transform.translate.y,
            onDrag: e=>entityStore.setValue(`${entityKey}.transform.translate`, {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }),
            onClick: e=>entityStore.setSelection([entityKey])
        },
            h("circle", {
                cx: cx, 
                cy: cy, 
                r:15, 
                style: {fill: "transparent"}
            })
        ), 

        /* draw light icon */
        h("g", {style: {pointerEvents: "none"}}, 
            h("circle", {
                cx: cx, 
                cy: cy, 
                r:entity.selected ? 4 : 2,
                style: {
                    fill: "white",
                    stroke: "white"
                }
            }),
            Array.from({length: 9}).map((_, k)=>{
                return h("line", {
                    x1:cx+Math.cos(k/9*Math.PI*2 + angle)*7, 
                    y1:cy+Math.sin(k/9*Math.PI*2 + angle)*7, 
                    x2:cx+Math.cos(k/9*Math.PI*2 + angle)*10, 
                    y2:cy+Math.sin(k/9*Math.PI*2 + angle)*10, 
                    stroke: "white",
                    strokeWidth: entity.selected ? 3 : 1,
                    strokeLinecap: "round"
                })
            })
        )
    )
}

export default PointLight;