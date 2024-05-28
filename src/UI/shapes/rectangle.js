import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";
import {rotatePoint} from "../../utils.js"
function Rectangle({
    entityKey, entity, ...props
})
{
    const cx = entity.transform.translate.x;
    const cy = entity.transform.translate.y;
    const angle = entity.transform.rotate;
    const width = entity.shape.width;
    const height = entity.shape.height;

    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.setValue(`${entityKey}.transform.translate`, {
            x: e.sceneX+e.referenceOffsetX, 
            y: e.sceneY+e.referenceOffsetY
        })
    }, 
        h("rect"/* draw shape */, {
            className: entity.selected ? "shape selected" : "shape",
            x: entity.transform.translate.x-entity.shape.width/2, 
            y: entity.transform.translate.y-entity.shape.height/2, 
            width: entity.shape.width,
            height: entity.shape.height,
            style: {
                transform: `rotate(${entity.transform.rotate}rad)`,
                transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
            },
            ...props
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(RotateManip, {
                cx,cy,angle,
                distance: entity.shape.height/2+8,
                axis: "Y",
                onChange: e=>entityStore.setValue(`${entityKey}.transform.rotate`, e.value)
            }),

            h(Manipulator /*  manip width and height*/, {
                className:"manip",
                onDrag: e=>{
                    const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -entity.transform.rotate, entity.transform.translate.x, entity.transform.translate.y);
                    
                    const newWidth = Math.max(1, (localX-entity.transform.translate.x)*2);
                    const newHeight = Math.max(1, (localY-entity.transform.translate.y)*2);

                    entityStore.setValue(`${entityKey}.shape.width`, newWidth);
                    entityStore.setValue(`${entityKey}.shape.height`, newHeight);
                }
            },
                h("path", {
                    d: "M0,-10 L0,0 L-10,00",
                    stroke: "white",
                    strokeWidth: "5px",
                    fill: "transparent",
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        cursor: "nwse-resize",
                        transform: ` rotate(${angle}rad) translate(${cx+width/2+4}px, ${cy+height/2+4}px)`,
                        transformOrigin: `${cx}px ${cy}px`
                    }
                })
            )
        )
    )
}

export default Rectangle;