import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function Line({
    x1,y1,x2,y2,
    entityKey, 
    entity, 
    ...props
})
{
    const x1 = entity.transform.translate.x - Math.cos(entity.transform.rotate)*entity.shape.length/2;
    const y1 = entity.transform.translate.y - Math.sin(entity.transform.rotate)*entity.shape.length/2;
    const x2 = entity.transform.translate.x + Math.cos(entity.transform.rotate)*entity.shape.length/2;
    const y2 = entity.transform.translate.y + Math.sin(entity.transform.rotate)*entity.shape.length/2;

    function setP1(x1,y1)
    {
        entityStore.setValue(`${entityKey}.transform`, {
            translate: {
                x: (x1+x2)/2, 
                y: (y1+y2)/2
            },
            rotate: Math.atan2(y2-y1, x2-x1)
        });
        entityStore.setValue(`${entityKey}.shape.length`, Math.hypot(x2-x1, y2-y1));
    }

    function setP2(x2,y2)
    {
        entityStore.setValue(`${entityKey}.transform`, {
            translate: {
                x: (x1+x2)/2, 
                y: (y1+y2)/2
            },
            rotate: Math.atan2(y2-y1, x2-x1)
        });

        entityStore.setValue(`${entityKey}.shape.length`, Math.hypot(x2-x1, y2-y1));
    }

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
            h("line" /* draw shape */, {
                className: entity.selected ? "shape selected" : "shape",
                x1: x1,
                y1: y1,
                y2: y2,
                x2: x2,
                style:{
                    // transform: `rotate(${entity.transform.rotate}rad) translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px)`,
                    // transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`,
                    strokeWidth: 3
                },
                ...props
            }),

            h("line" /* selection shape */, {
                // className: entity.selected ? "shape selected" : "shape",
                x1: x1,
                y1: y1,
                y2: y2,
                x2: x2,
                style:{
                    // transform: `rotate(${entity.transform.rotate}rad) translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px)`,
                    // transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`,
                    strokeWidth: 10,
                    stroke: "transparent"
                },
                ...props
            }),

            /* Manipulators */
            h("g", {style: {display: entity.selected?"initial":"none"}}, 
                h(Manipulator /* Move P1 */, {
                    className: "manipulator",
                    referenceX: x1,
                    referenceY: y1,
                    onDrag: e=>setP1(e.sceneX, e.sceneY),
                    style: {
                        cursor: "move"
                    }
                }, 
                    h("circle", {cx: x1, cy:y1, r:5})
                ),

                h(Manipulator /* Move P2 */, {
                    className: "manipulator",
                    referenceX: x2,
                    referenceY: y2,
                    onDrag: e=>setP2(e.sceneX, e.sceneY),
                    style: {
                        cursor: "move"
                    }
                }, 
                    h("circle", {cx: x2, cy:y2, r:5})
                )
            )
        )
    )
}

export default Line;