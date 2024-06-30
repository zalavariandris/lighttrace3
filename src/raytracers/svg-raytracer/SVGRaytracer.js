import _ from "lodash"
import React from "react";
import entityStore from "../../stores/entity-store.js";
import settingsStore from "../../stores/settings-store.js";

import * as vec2 from "../../vec2.js"

import { Circle, Triangle, LineSegment, Rectangle, SphericalLens } from "./Shapes.js";
import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";
import { HitInfo, HitSpan, collapseSpan, firstUnion, subtractSpan, hitCircle, hitLine, hitTriangle, hitSphericalLens, hitRectangle } from "./hitTest.js"
import { sampleMirror, sampleDiffuse, sampleDielectric, snellsLaw, sellmeierEquation, cauchyEquation } from "./sampleMaterials.js";
import { myrandom} from "../../utils.js"

const EPSILON = 0.001;

const h = React.createElement;

class LightRay{
    x;
    y;
    dx;
    dy;
    intensity;
    wavelength;

    constructor(x,y,dx,dy,intensity, wavelength){
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.intensity = intensity;
        this.wavelength = wavelength;
    }
}

function hitScene(ray, shapeEntities)
{
    // adjust ray to avoud zero distance collisions   


    /* intersect rays with CSG scene */
    let sceneHitSpan = null;
    for(let i=0;i<shapeEntities.length; i++)
    {
        const entity = shapeEntities[i];
        const cx = entity.transform.translate.x;
        const cy = entity.transform.translate.y;
        const angle = entity.transform.rotate;
        let shapeHitSpan;
        switch (entity.shape.type) {
            case "circle":
                shapeHitSpan = hitCircle(ray, new Circle(
                    cx, 
                    cy, 
                    entity.shape.radius));
                break;
            case "rectangle":
                shapeHitSpan = hitRectangle(ray, new Rectangle(
                    cx, 
                    cy, 
                    angle, 
                    entity.shape.width, 
                    entity.shape.height));
                break;
            case "triangle":
                shapeHitSpan = hitTriangle(ray, new Triangle(
                    cx, 
                    cy, 
                    entity.transform.rotate, 
                    entity.shape.size));
                break;
            case "line":
                const x1 = cx - Math.cos(angle)*entity.shape.length/2;
                const y1 = cy - Math.sin(angle)*entity.shape.length/2;
                const x2 = cx + Math.cos(angle)*entity.shape.length/2;
                const y2 = cy + Math.sin(angle)*entity.shape.length/2;
                shapeHitSpan = hitLine(ray, new LineSegment( x1, y1, x2, y2));
                break;
            case "sphericalLens":
                shapeHitSpan = hitSphericalLens(ray, new SphericalLens(
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

        if(shapeHitSpan && sceneHitSpan){
            if(shapeHitSpan.enter.t>sceneHitSpan.enter.t){
                sceneHitSpan = subtractSpan(sceneHitSpan, shapeHitSpan);
            }else{
                sceneHitSpan = subtractSpan(shapeHitSpan, sceneHitSpan);
            } 
        }else if(shapeHitSpan){
            sceneHitSpan = shapeHitSpan;
        }
    }

    return sceneHitSpan;
}

const bounceRays = (ray, hit, random_number)=>{
    let secondary;
    if(hit)
    {
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
                [woX, woY] =  sampleDiffuse(wiX, wiY, myrandom(random_number*500+1));
                break;
            case "glass":
                const sellmeierIor =  sellmeierEquation(
                    [1.03961212, 0.231792344, 1.01046945], 
                    [0.00600069867, 0.0200179144, 103.560653],
                    ray.wavelength*1e-3
                );
                const cauchyIor =  cauchyEquation(1.44, 0.02, ray.wavelength*1e-3);
                [woX, woY] =  sampleDielectric(wiX, wiY, cauchyIor, myrandom(random_number*100+1));
                [woX, woY] =  snellsLaw(wiX, wiY, cauchyIor);
                break;
            default:
                [woX, woY] =  sampleMirror(wiX, wiY);
                break;
        }

        /* exiting ray to world space */
        const vx = woY * hit.nx + woX * tangentX;
        const vy = woY * hit.ny + woX * tangentY;   

        secondary = new LightRay(
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
    let allHits = []
    let rayLines = [];

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
                    return new LightRay(0,0,0,0,0,0);
            }
        }).flat(1);

    if(rays.length>0)
    {
        /* RAYTRACE */
        const shapeEntities = Object.values(scene).filter(entity=>entity.hasOwnProperty("shape"));
        for(let i=0; i<settings.raytrace.maxBounce; i++)
        {
            /* Raytrace Scene */
            const raytraceInfo = rays.map(ray=>{
                if(ray==null){return [null,null, null];}

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
                const secondary = bounceRays(ray, hit, myrandom(i+1));

                // return raytrace results
                return [hitSpan, hit, secondary];
            });

            const [hitSpans, hits, secondaries] = _.unzip(raytraceInfo);

            /* collect */
            allRays = [...allRays, ...rays]
            allIntersectionSpans = [...allIntersectionSpans, ...hitSpans];
            allHits = [...allHits, ...hits];

            rays = secondaries;
        }
    }
    
    return h('g', {
        className: 'svg-raytracer',
        style: {
            pointerEvents: "none"
        }
    },
        h('g', {
            className: 'lightpaths',
        },
            settings.display.paths && _.zip(allRays, allHits).filter(([ray, hit])=>ray).map(([ray, hit])=>
                h('line', {
                    x1: ray.x,
                    y1: ray.y,
                    x2: hit?ray.x+ray.dx*hit.t:ray.x+ray.dx*9999,
                    y2: hit?ray.y+ray.dy*hit.t:ray.y+ray.dy*9999,
                    className: 'lightray',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "white",
                        opacity: ray.intensity
                    }
                })
            )
        ),

        // draw hit normals
        h('g', {
            className: 'hitNormals'
        },
            settings.display.normals && _.zip(allRays, allHits).filter(([ray, hit])=>hit).map(([ray, hit])=>
                h('line', {
                    x1: ray.x+ray.dx*hit.t,
                    y1: ray.y+ray.dy*hit.t,
                    x2: ray.x+ray.dx*hit.t+hit.nx*20,
                    y2: ray.y+ray.dy*hit.t+hit.ny*20,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "green",
                        opacity: 1.0
                    }
                })
            )
        ),

        // draw rays
        h('g', {
            className: 'rays'
        },
            settings.display.rays && allRays.filter(ray=>ray).map(ray =>
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

        // draw hitSpans
        h("g", {
            className:"intersection-spans"
        },
            settings.display.hitSpans && _.zip(allRays, allIntersectionSpans).filter(([ray, ispan])=>ispan).map(([ray, ispan]) =>
                h("g", null, 
                    h('line', {
                        x1: ray.x+ray.dx*ispan.enter.t,
                        y1: ray.y+ray.dy*ispan.enter.t,
                        x2: ray.x+ray.dx*ispan.exit.t,
                        y2: ray.y+ray.dy*ispan.exit.t,
                        className: 'intersection',
                        vectorEffect: "non-scaling-stroke",
                        // markerEnd:"url(#arrow)",
                        stroke:"cyan",
                        strokeWidth: 3,
                        opacity: 0.05
                    }),
                    h("text",{
                        x: ray.x+ray.dx*ispan.enter.t,
                        y: ray.y+ray.dy*ispan.enter.t,
                        fontSize: "50%",
                        fill:"red",
                        stroke: "none"
                    }, "enter"),
                    h("text",{
                        x: ray.x+ray.dx*ispan.exit.t,
                        y: ray.y+ray.dy*ispan.exit.t,
                        fontSize: "50%",
                        fill:"cyan",
                    }, "exit")
                )
            )
        )
    );
}

export default SVGRaytracer;