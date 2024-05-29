import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
import {rotatePoint, makePathFromLens} from "../../utils.js"

const h = React.createElement;

function Lens({
    entityKey, 
    entity, 
    ...props
})
{
    const cx = entity.transform.translate.x;
    const cy = entity.transform.translate.y;
    const angle = entity.transform.rotate;

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
            h("path" /* draw shape */, {
                d: makePathFromLens({
                    cx: entity.transform.translate.x, 
                    cy: entity.transform.translate.y, 
                    diameter: entity.shape.diameter, 
                    edgeThickness: entity.shape.edgeThickness, 
                    centerThickness: entity.shape.centerThickness,
                }),
                style: {
                    transform: `rotate(${entity.transform.rotate}rad)`,
                    transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
                },
                ...props
            }),

            h("g", {
                className: "manipulator",
                style: {
                    display: entity.selected?"initial":"none"
                }
            }, 
                h(RotateManip,{
                    cx,cy,angle,
                    distance: Math.max(entity.shape.centerThickness/2+16, entity.shape.edgeThickness/2),
                    onChange: e=>entityStore.setValue(`${entityKey}.transform.rotate`, e.value)
                    
                }),

                h(Manipulator /* manip centerThickness*/, {
                    onDrag: e=>{
                        const distance = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)
                        entityStore.setValue(`${entityKey}.shape.centerThickness`,
                            Math.max(0, Math.min(distance*2, entity.shape.diameter))
                        )
                    },
                    className:"gizmo"
                }, 
                    h('circle', {
                        className: "handle",
                        cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.centerThickness/2, 
                        cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.centerThickness/2,
                        r: 5,
                        vectorEffect: "non-scaling-stroke",
                        style: {cursor: "ew-resize"}
                    })
                ),

                h(Manipulator /*  manip edgeThickness and diameter*/, {
                    className:"manip",
                    onDrag: e=>{
                        const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -entity.transform.rotate, entity.transform.translate.x, entity.transform.translate.y);
                        
                        const newEdgeThickness = Math.max(1, (localX-entity.transform.translate.x)*2);
                        const newDiameter = Math.max(1, (localY-entity.transform.translate.y)*2);
                        const newCenterThickness = Math.max(1, newEdgeThickness-entity.shape.edgeThickness + entity.shape.centerThickness);

                        entityStore.setValue(`${entityKey}.shape.edgeThickness`, newEdgeThickness);
                        entityStore.setValue(`${entityKey}.shape.centerThickness`, newCenterThickness);
                        entityStore.setValue(`${entityKey}.shape.diameter`, newDiameter);
                    }
                },
                    h('circle', {
                        className: "gizmo",
                        cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.edgeThickness/2+Math.cos(entity.transform.rotate+Math.PI/2)*entity.shape.diameter/2, 
                        cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.edgeThickness/2+Math.sin(entity.transform.rotate+Math.PI/2)*entity.shape.diameter/2,
                        r: 5,
                        vectorEffect: "non-scaling-stroke",
                        style: {cursor: "nwse-resize"}
                    }),
                )
            )
        )
    )
}

export default Lens;