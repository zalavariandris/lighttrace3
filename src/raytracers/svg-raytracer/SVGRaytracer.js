import _ from "lodash"
import React from "react";
import entityStore from "../../stores/entity-store.js";
import settingsStore from "../../stores/settings-store.js";

import * as vec2 from "../../vec2.js"

import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";
import { HitInfo, hitCircle, hitLineSegment, hitTriangle, hitSphericalLens, hitRectangle } from "./hitTest.js"
import { sampleMirror, sampleDiffuse, sampleDielectric } from "./sampleMaterials.js";

const EPSILON = 0.001;

const h = React.createElement;

function SVGRaytracer()
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    /*
    * RAYTRACE
    */

    /* prepare svg visualization objects */
    let allRays = [];
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
                    return {
                        x:0, 
                        y:0, 
                        dx:0, 
                        dy:0,
                        intensity: 0,
                        wavelength: 0
                    }
            }
        }).flat(1);

    /* BOUNCE RAYS AROUND SCENE */
    const shapeEntities = Object.values(scene).filter(entity=>entity.hasOwnProperty("shape"));
    for(let i=0; i<settings.raytrace.maxBounce; i++)
    {
        /* intersect scene */
        const hits = rays.map(ray=>{
            ray.x+=ray.dx*EPSILON;
            ray.y+=ray.dy*EPSILON;
            let hitInfo = new HitInfo(9999, ray.x+ray.dx*9999, ray.y+ray.dy*9999, 0, 0, -1);
    
            /* intersect rays with CSG */
            let currentHit = hitInfo;
            let exitHit;

            shapeEntities.forEach(entity=>{
                const cx = entity.transform.translate.x;
                const cy = entity.transform.translate.y;
                const angle = entity.transform.rotate;
                let hitSpan;
                switch (entity.shape.type) {
                    case "circle":
                        hitSpan = hitCircle(ray, 
                            cx, 
                            cy, 
                            entity.shape.radius);
                        break;
                    case "rectangle":
                        hitSpan = hitRectangle(ray, 
                            cx, 
                            cy, 
                            angle, 
                            entity.shape.width, 
                            entity.shape.height);
                        break;
                    case "sphericalLens":
                        hitSpan = hitSphericalLens(ray, 
                            cx, 
                            cy, 
                            angle, 
                            entity.shape.diameter,
                            entity.shape.centerThickness,
                            entity.shape.edgeThickness);
                        break;
                    case "triangle":
                        hitSpan = hitTriangle(ray, 
                            entity.transform.translate.x, 
                            entity.transform.translate.y, 
                            entity.transform.rotate, 
                            entity.shape.size);
                        break;
                    case "line":
                        const x1 = cx - Math.cos(angle)*entity.shape.length/2;
                        const y1 = cy - Math.sin(angle)*entity.shape.length/2;
                        const x2 = cx + Math.cos(angle)*entity.shape.length/2;
                        const y2 = cy + Math.sin(angle)*entity.shape.length/2;
                        hitSpan = hitLineSegment(ray, x1, y1, x2, y2);
                        break;
                    default:
                        hitSpan = new HitSpan(null, null);
                        break;
                }

                currentHit = hitSpan.enter;
                if(currentHit.t<hitInfo.t)
                {
                    hitInfo = currentHit;
                    hitInfo.material = entity.material;
                }
            });

            return hitInfo;
        });

        /* add lines to SVG */
        allRays = [...allRays, ...rays];
        rayLines = [...rayLines, ..._.zip(rays, hits).map(([ray, hit])=>{
            return {
                x1: ray.x,
                y1: ray.y,
                x2: hit.x,
                y2: hit.y,
                opacity: ray.intensity
            }
        })]
        hitLines = [...hitLines, ...hits.map(hit=>{
            return {
                x1: hit.x,
                y1: hit.y,
                x2: hit.x+hit.nx*20,
                y2: hit.y+hit.ny*20
            }
        })]

        /* BOUNCE RAYS */
        const secondary = _.zip(rays, hits).map( ([ray, hit], i)=>{
            const RandomNumber = i/rays.length;
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
                    [woX, woY] =  sampleDielectric(wiX, wiY, 1.44, RandomNumber);
                    break;
                default:
                    [woX, woY] =  sampleMirror(wiX, wiY);
                    break;
            }

            /* exiting ray to world space */
            const vx = woY * hit.nx + woX * tangentX;
            const vy = woY * hit.ny + woX * tangentY;   

            return {
                x:hit.x, 
                y:hit.y, 
                dx:-vx, 
                dy:-vy,
                intensity: ray.intensity,
                wavelength: ray.wavelength
            }

        });

        rays = secondary;
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
                style: {
                    opacity: settings.display.rays?1.0:0.0
                }
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
                        // stroke: RGBToCSS(wavelengthToRGB(ray.wavelength), ray.intensity)
                    }
                })
            )
        ),

        // draw hit normals
        settings.display.normals && hitLines.map(path =>
            h('g', {
                className: 'hitNormals'
            },
                h('line', {
                    x1: path.x1,
                    y1: path.y1,
                    x2: path.x2,
                    y2: path.y2,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "green"
                        // stroke: RGBToCSS(wavelengthToRGB(ray.wavelength), ray.intensity)
                    }
                })
            )
        ),

        // draw ray paths
        settings.display.rays && allRays.map(ray =>
            h('g', {
                className: 'rays'
            },
                h('line', {
                    x1: ray.x,
                    y1: ray.y,
                    x2: ray.x+ray.dx*50,
                    y2: ray.y+ray.dy*50,
                    className: 'intersection',
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        stroke: "orange"
                        // stroke: RGBToCSS(wavelengthToRGB(ray.wavelength), ray.intensity)
                    }
                })
            )
        ),
    );
}

export default SVGRaytracer;