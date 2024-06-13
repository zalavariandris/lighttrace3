import _ from "lodash"
import React from "react";
import entityStore from "../../stores/entity-store.js";
import settingsStore from "../../stores/settings-store.js";

import * as vec2 from "../../vec2.js"

import { makeCircle, makeTriangle, makeLineSegment, makeRectangle, makeSphericalLens } from "./hitTest.js";
import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";
import { HitInfo, HitSpan, collapseSpan, firstUnion, hitCircle, hitLine, hitTriangle, hitSphericalLens, hitRectangle } from "./hitTest.js"
import { sampleMirror, sampleDiffuse, sampleDielectric, sellmeierEquation, cauchyEquation } from "./sampleMaterials.js";

const EPSILON = 0.001;

const h = React.createElement;

function hitScene(ray, shapeEntities){
    /* intersect rays with CSG scene */
    const hitSpanResult = shapeEntities.reduce((sceneHitSpan, entity)=>{
        const cx = entity.transform.translate.x;
        const cy = entity.transform.translate.y;
        const angle = entity.transform.rotate;
        let shapeHitSpan;
        switch (entity.shape.type) {
            case "circle":
                shapeHitSpan = hitCircle(ray, makeCircle(
                    cx, 
                    cy, 
                    entity.shape.radius));
                break;
            case "rectangle":
                shapeHitSpan = hitRectangle(ray, makeRectangle(
                    cx, 
                    cy, 
                    angle, 
                    entity.shape.width, 
                    entity.shape.height));
                break;
            case "triangle":
                shapeHitSpan = hitTriangle(ray, makeTriangle(
                    entity.transform.translate.x, 
                    entity.transform.translate.y, 
                    entity.transform.rotate, 
                    entity.shape.size));
                break;
            case "line":
                const x1 = cx - Math.cos(angle)*entity.shape.length/2;
                const y1 = cy - Math.sin(angle)*entity.shape.length/2;
                const x2 = cx + Math.cos(angle)*entity.shape.length/2;
                const y2 = cy + Math.sin(angle)*entity.shape.length/2;
                shapeHitSpan = hitLine(ray, makeLineSegment( x1, y1, x2, y2));
                break;
            case "sphericalLens":
                shapeHitSpan = hitSphericalLens(ray, makeSphericalLens(
                    cx, 
                    cy, 
                    angle, 
                    entity.shape.diameter,
                    entity.shape.centerThickness,
                    entity.shape.edgeThickness));
                break;
            default:
                break;
        }
        
        if(shapeHitSpan){
            shapeHitSpan.enter.material = entity.material;
            shapeHitSpan.exit.material = entity.material;
        }

        if(shapeHitSpan && sceneHitSpan)
        {
            // find the first and the second cosest hitPoint
            const sortedIntersections = [shapeHitSpan.enter, shapeHitSpan.exit, sceneHitSpan.enter, sceneHitSpan.exit]
                .filter(hit => hit && hit.t > 0) // Filter out null and non-positive intersections
                .sort((a, b) => a.t - b.t); // Sort by the intersection time

            const enter = sortedIntersections[0];
            const exit = sortedIntersections.find(hit => hit.t > enter.t);

            sceneHitSpan = new HitSpan(enter, exit);
        }
        else if(shapeHitSpan)
        {
            sceneHitSpan = shapeHitSpan;
        }

        return sceneHitSpan;
    }, null);

    return hitSpanResult;
}

const sampleScene = (ray, hit)=>{
    let secondary;
    if(hit)
    {
        const RandomNumber = Math.random();
        const [tangentX, tangentY] = [-hit.ny, hit.nx];

        // incident ray to tangent space
        const wiX = vec2.dot([tangentX, tangentY], [ray.dx, ray.dy]);
        const wiY = vec2.dot([hit.nx, hit.ny], [ray.dx, ray.dy]);

        /* sample materials */
        let woX
        let woY;
        switch (hit.material.type) {
            case "mirror":
                [woX, woY] =  sampleMirror(wiX, wiY);
                break;
            case "diffuse":
                [woX, woY] =  sampleDiffuse(wiX, wiY, RandomNumber);
                break;
            case "glass":
                const sellmeierIor =  sellmeierEquation(
                    [1.03961212, 0.231792344, 1.01046945], 
                    [0.00600069867, 0.0200179144, 103.560653],
                    ray.wavelength*1e-3
                );
                const cauchyIor =  cauchyEquation(1.44, 0.02, ray.wavelength*1e-3);
                // console.log("ior", sellmeierIor);
                [woX, woY] =  sampleDielectric(wiX, wiY, cauchyIor, RandomNumber);
                break;
            default:
                [woX, woY] =  sampleMirror(wiX, wiY);
                break;
        }

        /* exiting ray to world space */
        const vx = woY * hit.nx + woX * tangentX;
        const vy = woY * hit.ny + woX * tangentY;   

        secondary = makeRay(
            hit.x, 
            hit.y, 
            -vx, 
            -vy,
            ray.intensity,
            ray.wavelength
        )
    }else{
        secondary=null
    }
    return secondary;
}


function makeRay(x,y,dx,dy,intensity, wavelength){
    return {x,y,dx,dy,intensity, wavelength};
}

function SVGRaytracer()
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    /*
    * RAYTRACE
    */

    /* prepare svg visualization objects */
    let allRays = [];
    let allIntersectionSpans = []

    let rayLines = [];
    let hitLines = [];

    /* CAST INITIAL RAYS */
    let rays = Object.entries(scene)
        .filter( ([key, entity])=>entity.hasOwnProperty("light") && entity.hasOwnProperty("transform") )
        .map( ([key, entity])=>{
            switch (entity.light.type) {
                case "point":
                    return samplePointLight(entity, 16);
                case "laser":
                    return sampleLaserLight(entity, 16);
                case "directional":
                    return sampleDirectionalLight(entity, 16, true);
                default:
                    return makeRay(0,0,0,0,0,0);
            }
        }).flat(1);

    /* BOUNCE RAYS AROUND SCENE */
    
    const shapeEntities = Object.values(scene).filter(entity=>entity.hasOwnProperty("shape"));
    for(let i=0; i<settings.raytrace.maxBounce; i++)
    {
        /* intersect scene */
        const raytraceInfo = rays.map(ray=>{
            if(ray==null){return [null,null];}

            // adjust ray to avoud zero distance collisions   
            ray = makeRay(
                ray.x+ray.dx*EPSILON, 
                ray.y+ray.dx*EPSILON,
                ray.dx,ray.dy, 
                ray.intensity, 
                ray.material
            );

            // calc ray hitspans with scene
            const hitSpan = hitScene(ray, shapeEntities);

            // closest intersection point of sceneHitSpanPerRay
            let hit;
            if(hitSpan){
                hit = hitSpan.enter.t>EPSILON ? hitSpan.enter : hitSpan.exit;
            }else{
                hit = null;
            }

            /* secondary ray */
            const secondary = sampleScene(ray, hit);

            // return raytrace results
            return [hitSpan, hit, secondary];
        });

        const [hitSpans, hits, S] = _.unzip(raytraceInfo);


        // /* BOUNCE RAYS */
        const secondaries = _.zip(rays, hits).map( ([ray, hit])=>sampleScene(ray, hit));

        /* add lines to SVG */
        allIntersectionSpans = [...allIntersectionSpans, ...hitSpans];
        allRays = [...allRays, ...rays].filter(ray=>ray);
        rayLines = [...rayLines, ..._.zip(rays, hits).map(([ray, hit])=>{
            if(ray==null) {return null;}
            return {
                x1: ray.x,
                y1: ray.y,
                x2: hit?hit.x:ray.x+ray.dx*9999,
                y2: hit?hit.y:ray.y+ray.dy*9999,
                opacity: ray.intensity
            }
        }).filter(line=>line)];

        hitLines = [...hitLines, ...hits.map(hit=>{
            if(hit==null) {return null;}
            return {
                x1: hit.x,
                y1: hit.y,
                x2: hit.x+hit.nx*20,
                y2: hit.y+hit.ny*20
            };
        }).filter(line=>line)]
        rays = secondaries;
    }
    
    return h('g', {
        className: 'svg-raytracer',
        style: {
            pointerEvents: "none"
        }
    },
        // draw rayArrows
        settings.display.paths && rayLines.map(path =>
            h('g', {
                className: 'lightpaths',
            },
                h('line', {
                    x1: path.x1,
                    y1: path.y1,
                    x2: path.x2,
                    y2: path.y2,
                    className: 'lightray',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "white",
                        opacity: path.opacity
                    }
                })
            )
        ),

        // draw hit normals
        h('g', {className: 'hitNormals'},
        settings.display.normals && hitLines.map(path =>
            h('line', {
                    x1: path.x1,
                    y1: path.y1,
                    x2: path.x2,
                    y2: path.y2,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "green",
                        opacity: 1.0
                    }
                })
            )
        ),

        // draw ray paths
        h('g', {
            className: 'rays'
        },
            settings.display.rays && allRays.map(ray =>
                h('line', {
                    x1: ray.x,
                    y1: ray.y,
                    x2: ray.x+ray.dx*50,
                    y2: ray.y+ray.dy*50,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "orange",
                        opacity: 0.5
                    }
                })
            )
        ),

        // draw hitsopans
        h("g", {className:"intersection-spans"},
            settings.display.hitSpans && allIntersectionSpans.filter(ispan=>ispan).map(ispan =>
                h('line', {
                    x1: ispan.enter.x,
                    y1: ispan.enter.y,
                    x2: ispan.exit.x,
                    y2: ispan.exit.y,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    markerEnd:"url(#arrow)",
                    stroke:"cyan",
                    strokeWidth: 5
                    // style: {
                    //     stroke: "cyan",
                    //     strokeWidth: 5,
                    //     opacity: 0.5
                    // }
                })
            )
        )
    );
}

export default SVGRaytracer;