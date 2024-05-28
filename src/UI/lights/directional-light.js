import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function DirectionalLight({entityKey, entity})
{
    const cx = entity.transform.translate.x;
    const cy = entity.transform.translate.y
    const angle = entity.transform.rotate;
    const width = entity.light.width;

    const x1 = cx - Math.cos(angle+Math.PI/2)*width/2;
    const y1 = cy - Math.sin(angle+Math.PI/2)*width/2;
    const x2 = cx + Math.cos(angle+Math.PI/2)*width/2;
    const y2 = cy + Math.sin(angle+Math.PI/2)*width/2;

    return h("g", {
        className: entity.selected ? "shape selected" : "shape",
        ...props
    }, 
    
        h(Manipulator /* move manip */, {
            referenceX: entity.transform.translate.x,
            referenceY: entity.transform.translate.y,
            onDrag: e=>entityStore.setValue(`${entityKey}.transform.translate`, {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }),
            onClick: e=>entityStore.setSelection([entityKey])
        },
            h("line", {
                x1, y1, x2, y2,
                stroke: "transparent",
                strokeWidth: 20
            })
        ),

        /* draw light icon */
        h("g", {style: {pointerEvents: "none"}},
            h("line", {
                x1, y1,x2,y2,
                stroke: "white",
                strokeWidth: entity.selected ? 3 : 1,
                strokeLinecap: "round"
            }),

            Array.from({length: 9}).map((_, k)=>{
                const offsetX = Math.cos(angle+Math.PI/2)*width*(k-4)/9;
                const offsetY = Math.sin(angle+Math.PI/2)*width*(k-4)/9;
                return h("line", {
                    x1:cx+offsetX+Math.cos(angle)*4, 
                    y1:cy+offsetY+Math.sin(angle)*4, 
                    x2:cx+offsetX+Math.cos(angle)*16, 
                    y2:cy+offsetY+Math.sin(angle)*16, 
                    stroke: "white",
                    strokeWidth: entity.selected ? 2 : 1,
                    strokeLinecap: "round"
                })
            }),

        ),


        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(RotateManip, {
                cx,cy,angle,
                distance: 100, 
                onChange:e=>entityStore.setValue(`${entityKey}.transform.rotate`, e.value)
            }),

            h(Manipulator /* width manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.setValue(`${entityKey}.light.width`, 
                    Math.hypot(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)*2
                )
            }, 
                h("circle", {
                    cx: entity.transform.translate.x+Math.cos(entity.transform.rotate+Math.PI/2)*(entity.light.width/2+10), 
                    cy: entity.transform.translate.y+Math.sin(entity.transform.rotate+Math.PI/2)*(entity.light.width/2+10), 
                    r:5,
                    className: "gizmo resize",
                    style: {
                        cursor: "ns-resize",
                    }
                }),
            )
        )
    )
}

export default DirectionalLight;