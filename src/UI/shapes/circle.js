import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js"
import Manipulator, {RotateManip} from "../Manipulators.js";

function Circle({
    entityKey, entity, ...props
})
{
    return h("g", {
        className: entity.selected ? "shape selected" : "shape",
        ...props
    }, 
        h(Manipulator /* Move Manip */, {
            referenceX: entity.transform.translate.x,
            referenceY: entity.transform.translate.y,
            onDrag: e=>entityStore.setValue(`${entityKey}.transform.translate`, {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            })
        }, 
            h("circle" /* draw shape */, {
                cx: entity.transform.translate.x, 
                cy: entity.transform.translate.y, 
                r: entity.shape.radius,
                ...props
            }),

            h(Manipulator /*  manip radius*/, {
                className:"manip",
                onDrag: e=>{
                    const newRadius = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)
                    entityStore.setValue(`${entityKey}.shape.radius`, newRadius);
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx: entity.transform.translate.x, 
                    cy: entity.transform.translate.y, 
                    r: entity.shape.radius,
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        fill: "none",
                        stroke: "transparent",
                        strokeWidth: 5,
                        cursor: "nwse-resize"
                    }
                }),
            )
        )
    )
}

export default Circle;