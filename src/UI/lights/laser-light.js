import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function LaserLight({entityKey, entity, ...props})
{
    
    const cx = entity.transform.translate.x;
    const cy = entity.transform.translate.y;
    const angle = entity.transform.rotate;

    return h("g", {
        className: entity.selected ? "light selected" : "light",
        ...props
    }, 
        h(Manipulator /* tmove manip */, {
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
                style: {
                    stroke: "transparent",
                    fill: "transparent"
                }
            })
        ), 

        /* draw light icon */
        h("g", {
            style: {
                pointerEvents: "none"
            }
        }, 
            h("circle", {
                cx: cx+Math.cos(angle)*16, 
                cy: cy+Math.sin(angle)*16, 
                r: entity.selected ? 1 : 1,
                style: {
                    fill: "white",
                    stroke: "white",
                    strokeDasharray: "0"
                }
            }),
            Array.from({length: 7}).map((_, k)=>{
                return h("line", {
                    x1:cx+Math.cos(angle)*16+Math.cos((k-3)/7*Math.PI*1.7 + angle)*2.5, 
                    y1:cy+Math.sin(angle)*16+Math.sin((k-3)/7*Math.PI*1.7 + angle)*2.5, 
                    x2:cx+Math.cos(angle)*16+Math.cos((k-3)/7*Math.PI*1.7 + angle)*4.5, 
                    y2:cy+Math.sin(angle)*16+Math.sin((k-3)/7*Math.PI*1.7 + angle)*4.5, 
                    stroke: "white",
                    strokeWidth: entity.selected ? 1 : 0.5,
                    strokeLinecap: "round",
                    strokeDasharray: "0"
                })
            }),
            h("line", {
                x1:cx+Math.cos(angle)*0, 
                y1:cy+Math.sin(angle)*0, 
                x2:cx+Math.cos(angle)*16, 
                y2:cy+Math.sin(angle)*16, 
                stroke: "white",
                strokeWidth: entity.selected ? 4 : 3,
                strokeLinecap: "round",
                strokeDasharray: "0"
            })
        ),

        
        h("g", {
            className: "manipulator",
            style: {
                display: entity.selected?"initial":"none"
            }
        }, 
            h(RotateManip, {
                cx:cx, 
                cy:cy, 
                angle: angle,
                distance: 100,
                onChange: e=>entityStore.setValue(`${entityKey}.transform.rotate`, e.value)
            })
            
        )
    )
}

export default LaserLight;