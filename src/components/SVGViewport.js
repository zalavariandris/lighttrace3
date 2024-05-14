import entityStore from "../entity-store.js"
import React from "react";
import Manipulator from "../widgets/Manipulator.js";
const h = React.createElement;


function SVGViewport({width, height, className, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);

    return h("svg", {width, height, className, ...props}, 
        Object.entries(scene).filter(([key, entity])=>entity.hasOwnProperty("shape")).map( ([key, entity])=>{
            return h(Manipulator, {
                referenceX: entity.pos.x,
                referenceY: entity.pos.y,
                onDrag: e=>entityStore.updateComponent(key, "pos", {
                    x: e.sceneX+e.referenceOffsetX, 
                    y: e.sceneY+e.referenceOffsetY
                }),
            }, 
                h("circle", {cx: entity.pos.x, cy: entity.pos.y, r:entity.shape.radius})
            )
        }),
        Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("pos") && entity.hasOwnProperty("light"))
            .map( ([key, entity])=>{
            return h(Manipulator, {
                referenceX: entity.pos.x,
                referenceY: entity.pos.y,
                onDrag: e=>entityStore.updateComponent(key, "pos", {
                    x: e.sceneX+e.referenceOffsetX, 
                    y: e.sceneY+e.referenceOffsetY
                }),
            }, 
                h("circle", {cx: entity.pos.x, cy: entity.pos.y, r:10, style:{fill:"orange"}})
            )
        })
    );
}

export default SVGViewport;