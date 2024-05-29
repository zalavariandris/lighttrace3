import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function PointLight({
    cx,cy,angle,
    onChange,
    ...props})
{

    return h("g", {
        ...props
    }, 
        /* drag manipulator */
        h(Manipulator, {
            referenceX: cx,
            referenceY: cy,
            onDrag: e=>{
                e.value = {
                    cx: e.sceneX+e.referenceOffsetX,
                    cy: e.sceneY+e.referenceOffsetY,
                    angle
                };
                onChange(e);
            },
        },
            h("circle", {
                cx: cx, 
                cy: cy, 
                r:15, 
                style: {fill: "transparent"}
            })
        ), 

        /* draw light icon */
        h("g", {
            style: {
                pointerEvents: "none"
            }
        }, 
            h("circle", {
                cx: cx, 
                cy: cy, 
                r:2,//entity.selected ? 4 : 2,
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
                    strokeWidth: 1,//entity.selected ? 3 : 1,
                    strokeLinecap: "round"
                })
            })
        )

        /* manipulators */
    )
}

export default PointLight;