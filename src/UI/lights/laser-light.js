import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
const h = React.createElement;

function LaserLight({
    cx,cy,angle,
    onChange,
    selected,
    ...props})
{
    
    return h("g", {
        ...props
    }, 
        h(Manipulator /* move manip */, {
            className: "manipulator hidden",
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
                className: "gizmo",
                cx: cx, 
                cy: cy, 
                r:15, 
                style: {
                    stroke: "transparent",
                    fill: "transparent"
                }
            })
        ), 

        /* draw light icon */
        h("g", {
            className: "presenter"
        }, 
            h("circle", {
                cx: cx+Math.cos(angle)*16, 
                cy: cy+Math.sin(angle)*16, 
                r: 1,//entity.selected ? 1 : 1,
            }),
            Array.from({length: 7}).map((_, k)=>{
                return h("line", {
                    x1:cx+Math.cos(angle)*16+Math.cos((k-3)/7*Math.PI*1.7 + angle)*2.5, 
                    y1:cy+Math.sin(angle)*16+Math.sin((k-3)/7*Math.PI*1.7 + angle)*2.5, 
                    x2:cx+Math.cos(angle)*16+Math.cos((k-3)/7*Math.PI*1.7 + angle)*4.5, 
                    y2:cy+Math.sin(angle)*16+Math.sin((k-3)/7*Math.PI*1.7 + angle)*4.5
                })
            }),
            h("line", {
                x1:cx+Math.cos(angle)*0, 
                y1:cy+Math.sin(angle)*0, 
                x2:cx+Math.cos(angle)*16, 
                y2:cy+Math.sin(angle)*16, 
                stroke: "white",
                strokeWidth: 3,//entity.selected ? 4 : 3,
                strokeLinecap: "round"
            })
        ),

        h("g", {
            className: "manipulator show-when-selected",
        }, 
            h(RotateManip, {
                cx:cx, 
                cy:cy, 
                angle: angle,
                distance: 100,
                onChange: e=>{
                    e.value = {
                        cx, cy, 
                        angle: e.value
                    };
                    onChange(e);
                }
            })
        )
    )
}

export default LaserLight;