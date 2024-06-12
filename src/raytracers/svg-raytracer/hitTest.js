import * as vec2 from "../../vec2.js"
const EPSILON = 0.001;
const LARGE_NUMBER = 9999;//.EPSILON;

class HitInfo
{
     constructor(t, x, y, nx=0, ny=0, material=-1)
    {
        this.t = t;
        this.x = x;
        this.y = y
        this.nx = nx;
        this.ny = ny
        this.material = material;
    }
}

class HitSpan{
    enter;
    exit;
    constructor(enter, exit){
        this.enter = enter;
        this.exit = exit;
    }
}

function makeRectangle(cx, cy, angle, width, height)
{
    return {cx,cy,angle, width, height};
}

function makeCircle(cx, cy, r){
    return {cx, cy, r};
}

function makeLineSegment(x1, y1, x2, y2){
    return {x1, y1, x2, y2};
}

function makeTriangle(cx, cy, angle, size){
    return {cx, cy, angle, size};
}

function makeSphericalLens(cx,cy,angle, diameter, centerThickness, edgeThickness){
    return {cx,cy,angle, diameter, centerThickness, edgeThickness}
}

/**
 * Calculates the center and radius of a circle that passes through three given points.
 * @param {number} Sx - The x-coordinate of the first point.
 * @param {number} Sy - The y-coordinate of the first point.
 * @param {number} Mx - The x-coordinate of the second point.
 * @param {number} My - The y-coordinate of the second point.
 * @param {number} Ex - The x-coordinate of the third point.
 * @param {number} Ey - The y-coordinate of the third point.
 * @returns {{cx: number, cy: number, r: number}} An object containing the x and y coordinates of the circle's center (cx, cy) and its radius (r).
 */
function makeCircleFromThreePoints([Sx, Sy], [Mx, My], [Ex, Ey])
{
    const a = Sx * (My - Ey) - Sy * (Mx - Ex) + Mx * Ey - Ex * My;
    
    const b = (Sx * Sx + Sy * Sy) * (Ey - My) 
            + (Mx * Mx + My * My) * (Sy - Ey)
            + (Ex * Ex + Ey * Ey) * (My - Sy);
    
    const c = (Sx * Sx + Sy * Sy) * (Mx - Ex) 
          + (Mx * Mx + My * My) * (Ex - Sx) 
          + (Ex * Ex + Ey * Ey) * (Sx - Mx);
    
    const cx = -b / (2.0 * a);
    const cy = -c / (2.0 * a);
    const r = Math.sqrt((cx - Sx) * (cx - Sx) + (cy - Sy) * (cy - Sy));
    return {cx, cy, r};
}


function collapseSpan(a, b)
{
    // be carefull. this is not equal to span union.
    // this will result with the closest enter and the farthest exit.
    if(a && b){
        const enter = a.enter.t < b.enter.t ? a.enter : b.enter;
        const exit =  a.exit.t  > b.exit.t ?  a.exit  : b.exit;
        if(enter.t>exit.t) {return null;}
        return new HitSpan(enter, exit);
    } else if(a){
        return a;
    }else if(b){
        return b
    }else{
        return null;
    }
}

function firstUnion(...hitSpans){
        // find closest entry intersection
        const enterSpan = hitSpans.reduce((a, b)=>{
            if(a && b && a.enter.t>0 && b.enter.t>0){
                return a.enter.t<b.enter.t ? a : b;
            }else if(a && a.enter.t>0){
                return a;
            }else{
                return b;
            }        
        });
    
        // find farthest exit intersection
        const exitSpan = hitSpans.reduce((a, b)=>{
            if(a && b && a.exit.t<LARGE_NUMBER && b.exit.t<LARGE_NUMBER){
                return a.exit.t>b.exit.t ? a : b;
            }else if(a && a.exit.t<LARGE_NUMBER){
                return a;
            }else{
                return b;
            }        
        });
    
        if(!enterSpan || !exitSpan){
            return null;
        }
    
        return new HitSpan(enterSpan.enter, exitSpan.exit);
}

function intersectSpan(a, b){
    // find the closest overlapping span
    // Warning!: Be carefull. intersecting two spans could result in two seperate spans.
    // here we only return the closest one

    if(a && b){
        const enter = a.enter.t > b.enter.t ? a.enter : b.enter;
        const exit  = a.exit.t  < b.exit.t  ? a.exit  : b.exit;
        if(enter.t>exit.t){
            return null;
        }
        return new HitSpan(enter, exit)
    }else{
        return null;
    }
}

function subtractSpan(a, b)
{
    // find the closest span after subtraction span
    // Warning!: Be carefull. intersecting two spans could result in two seperate spans.
    // here we only return the closest one
    if(a && b)
    {
        //           AAAAAAAAA
        //  1.    bb ---------
        //  2.    bbbbbbbbbb--
        //  3.    bbbbbbbbbbbbbbbbbb
        //  4.       ----bb
        //  5.       ------bbbbbbbbb
        //  6.       --------   bb
        //1.

        b.enter.nx*=-1;
        b.enter.ny*=-1;
        b.exit.nx*=-1;
        b.exit.ny*=-1;

        if( b.enter.t <= a.enter.t && 
            b.exit.t  < a.enter.t){
            return a;
        }

        //2.
        if( b.enter.t < a.enter.t &&
            b.exit.t  > a.enter.t && 
            b.exit.t  < a.exit.t){
            return new HitSpan(b.exit, a.exit)
        }

        //3.
        if( b.enter.t < a.enter.t &&
            b.exit.t  > a.exit.t ){
            return null
        }

        //4.
        if( b.enter.t >= a.enter.t &&
            b.exit.t < a.exit.t){
            return new HitSpan(a.enter, b.enter)
        }

        //5.
        if( b.enter.t >= a.enter.t &&
            b.enter.t < a.exit.t &&
            b.exit.t  > a.exit.t ){
            return new HitSpan(a.enter, b.enter)
        }

        //6.
        if( b.enter.t > a.enter.t &&
            b.exit.t  > a.exit.t
        ){
            return a;
        }
    }
    return a;
}

/**
 * Calculates the closest intersection of a ray with a circle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - The x-coordinate of the circle's center.
 * @param {number} cy - The y-coordinate of the circle's center.
 * @param {number} r - The radius of the circle.
 * @returns {HitSpan} - a pair of enter/exit hitInfo
 */
function hitCircle(ray, {cx, cy, r})
{
    const ux = ray.x - cx;
    const uy = ray.y - cy;

    const B = vec2.dot([ux, uy], [ray.dx, ray.dy]);
    const C = vec2.dot([ux, uy], [ux, uy]) - r*r;
    const detSq = B*B - C;

    if (detSq >= 0)
    {
        const det = Math.sqrt(detSq);
        const tNear = -B - det;
        const tFar  = -B + det;

        // If t far is greater than 0 than ther is an exit point
        // If enter point is negative we are inside the shape, 
        // then Let the intersection span begin at the origin of ray
        if(tFar>0)
        {
            //exit point
            const Ix2 = ray.x+ray.dx*tFar;
            const Iy2 = ray.y+ray.dy*tFar;
            // exit normal
            let [Nx2, Ny2] = vec2.normalize(Ix2-cx, Iy2-cy);

            // exit info
            const exit = new HitInfo(tFar, Ix2, Iy2, Nx2, Ny2, -1);


            if(tNear<0){
                return new HitSpan(
                    new HitInfo(0, ray.x, ray.y), 
                    exit
                );
            }

            // enter point
            const Ix1 = ray.x+ray.dx*tNear;
            const Iy1 = ray.y+ray.dy*tNear;

            // enter normal
            let [Nx1, Ny1] = vec2.normalize(Ix1-cx, Iy1-cy);

            //enter info
            const enter = new HitInfo(tNear, Ix1, Iy1, Nx1, Ny1, -1);

            // intersection span
            return new HitSpan(enter, exit);
        }
    }

    return null;

}



/**
 * Calculates the closest intersection of a ray with a line segment.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} x1 - The x-coordinate of P1
 * @param {number} y1 - The y-coordinate of P1
 * @param {number} x2 - The x-coordinate of P2
 * @param {number} y2 - The y-coordinate of P2
 * @returns {HitSpan} - a pair of enter/exit hitInfo
 */
function hitLine(ray, {x1, y1, x2, y2})
{

    const tangentX = x2-x1;
    const tangentY = y2-y1;

    // Calculate the determinant
    const determinant = ray.dx * tangentY - ray.dy * tangentX;

    if (Math.abs(determinant) < 0){
        return null;
    }

    // Calculate the intersection along the ray
    const tNear = ((x1 - ray.x) * tangentY - (y1 - ray.y) * tangentX) / determinant;

    // Calculate intersection along the line
    const tLine = ((x1 - ray.x) * ray.dy - (y1 - ray.y) * ray.dx) / determinant;
    
    if(tNear<=0 || tLine<=0 || tLine>=1){
        return null;
    }

    const Ix = ray.x+ray.dx*tNear;
    const Iy = ray.y+ray.dy*tNear;

    let Nx = -tangentY;
    let Ny = tangentX;
    [Nx, Ny] = vec2.normalize(-Nx, -Ny);

    return new HitSpan(
        new HitInfo(tNear, Ix, Iy, Nx, Ny, -1),
        new HitInfo(tNear+EPSILON, Ix, Iy, Nx, Ny, -1)
    );

    //
    if (determinant < 0){ // from outside
        const enter = new HitInfo(tNear, Ix, Iy, Nx, Ny, -1);
        const exit  = new HitInfo(LARGE_NUMBER, ray.x+ray.dx*LARGE_NUMBER, ray.y+ray.dy*LARGE_NUMBER, 0,0, -1);
        return new HitSpan(
            enter,enter
        );
    }else{ // from inside
        const enter = new HitInfo(0, ray.x, ray.y, 0, 0, -1);
        const exit  = new HitInfo(tNear, Ix, Iy, Nx, Ny, -1);
        return new HitSpan(
            exit, exit
        );
    }
}

/**
 * Calculates the closest intersection of a ray with a equilateral triangle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - center of triangle
 * @param {number} cy - center of triangle
 * @param {number} angle - triabngle rotation
 * @param {number} size - vertices distance from center
 * @returns {HitSpan} - a pair of enter/exit hitInfo
 */

function hitTriangle(ray, {cx, cy, angle, size}){
    const vertices = Array.from({length:3}).map( (_,k)=>{
        let a = k/3.0*Math.PI*2.0-Math.PI/2.0 + angle;
        return {
            x: Math.cos(a)*size + cx,
            y: Math.sin(a)*size + cy
        };
    });

    // intersect each side
    const hitSpanA = hitLine(ray, makeLineSegment(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y));
    const hitSpanB = hitLine(ray, makeLineSegment(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y));
    const hitSpanC = hitLine(ray, makeLineSegment(vertices[2].x, vertices[2].y, vertices[0].x, vertices[0].y));

    // find closest entry intersection
    const enterSpan = [hitSpanA, hitSpanB, hitSpanC].reduce((a, b)=>{
        if(a && b && a.enter.t>0 && b.enter.t>0){
            return a.enter.t<b.enter.t ? a : b;
        }else if(a && a.enter.t>0){
            return a;
        }else{
            return b;
        }        
    });

    // find farthest exit intersection
    const exitSpan = [hitSpanA, hitSpanB, hitSpanC].reduce((a, b)=>{
        if(a && b && a.exit.t<LARGE_NUMBER && b.exit.t<LARGE_NUMBER){
            return a.exit.t>b.exit.t ? a : b;
        }else if(a && a.exit.t<LARGE_NUMBER){
            return a;
        }else{
            return b;
        }        
    });

    if(!enterSpan || !exitSpan){
        return null;
    }

    return new HitSpan(enterSpan.enter, exitSpan.exit);
}

/**
 * Calculates the closest intersection of a ray with a rectangle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - center of rectangle
 * @param {number} cy - center of rectangle
 * @param {number} angle - rotation (in radians)
 * @param {number} width - the width of the rectangle
 * @param {number} height - rectangle height
 * @returns {[HitInfo, HitInfo]} - a pair of enter/exit hitInfo
 */
function hitRectangle(ray, {cx, cy, angle, width, height})
{
    const [rayX, rayY] = vec2.rotate([ray.x, ray.y], -angle, [cx, cy]);
    const [dirX, dirY] = vec2.rotate([ray.dx, ray.dy], -angle);

    const tNearX = (cx - width  / 2.0 - rayX) / dirX;
    const tNearY = (cy - height / 2.0 - rayY) / dirY;
    const tFarX =  (cx + width  / 2.0 - rayX) / dirX;
    const tFarY =  (cy + height / 2.0 - rayY) / dirY;

    const tNear = Math.max(Math.min(tNearX, tFarX), Math.min(tNearY, tFarY));
    const tFar =  Math.min(Math.max(tNearX, tFarX), Math.max(tNearY, tFarY));

    if(tNear>tFar) return null;
    // find closest
    if(tFar>0){
        //exit point
        let Ix2 = rayX+dirX*tFar;
        let Iy2 = rayY+dirY*tFar;

        // exit normal
        let Nx2 = 0.0;
        let Ny2 = 0.0;
        if (Ix2+EPSILON >= cx - width / 2.0  && Ix2-EPSILON <= cx + width / 2.0 &&
            Iy2+EPSILON >= cy - height / 2.0 && Iy2-EPSILON <= cy + height / 2.0) {
            if        (Math.abs(Ix2 - cx + width / 2.0) < EPSILON) {
                [Nx2, Ny2] = [-1.0, 0.0];
            } else if (Math.abs(Ix2 - cx - width / 2.0) < EPSILON) {
                [Nx2, Ny2] = [1.0, 0.0];
            } else if (Math.abs(Iy2 - cy + height / 2.0) < EPSILON) {
                [Nx2, Ny2] = [0.0, -1.0];
            } else if (Math.abs(Iy2 - cy - height / 2.0) < EPSILON) {
                [Nx2, Ny2] = [0.0, 1.0];
            }
        }

        [Ix2, Iy2] = vec2.rotate([Ix2, Iy2], angle, [cx, cy]);
        [Nx2, Ny2] = vec2.rotate([Nx2, Ny2], angle);
        const exit = new HitInfo(tFar, Ix2, Iy2, Nx2, Ny2, -1);

        if(tNear<0){
            // when the enter point is behind the ray's origin, 
            // then intersection span will begin at the rays origin
            return new HitSpan(
                new HitInfo(0, ray.x, ray.y),
                exit
            );
        }

        //enter point
        let Ix1 = rayX+dirX*tNear;
        let Iy1 = rayY+dirY*tNear;

        // enter normal
        let Nx1 = 0.0;
        let Ny1 = 0.0;
        if (Ix1+EPSILON >= cx - width / 2.0  && Ix1-EPSILON <= cx + width / 2.0 &&
            Iy1+EPSILON >= cy - height / 2.0 && Iy1-EPSILON <= cy + height / 2.0) {
            if        (Math.abs(Ix1 - cx + width / 2.0) < EPSILON) {
                [Nx1, Ny1] = [-1.0, 0.0];
            } else if (Math.abs(Ix1 - cx - width / 2.0) < EPSILON) {
                [Nx1, Ny1] = [1.0, 0.0];
            } else if (Math.abs(Iy1 - cy + height / 2.0) < EPSILON) {
                [Nx1, Ny1] = [0.0, -1.0];
            } else if (Math.abs(Iy1 - cy - height / 2.0) < EPSILON) {
                [Nx1, Ny1] = [0.0, 1.0];
            }
        }

        // enter hit info
        [Ix1, Iy1] = vec2.rotate([Ix1, Iy1], angle, [cx, cy]);
        [Nx1, Ny1] = vec2.rotate([Nx1, Ny1], angle);
        const enter = new HitInfo(tNear, Ix1, Iy1, Nx1, Ny1, -1);

        // return intersection span between the enter- and exit point
        return new HitSpan(enter, exit);
    }
    return null;
}

/**
 * Determines if a point is within a given circle.
 * @param {number} cx - The x-coordinate of the circle's center.
 * @param {number} cy - The y-coordinate of the circle's center.
 * @param {number} r - The radius of the circle.
 * @param {number} px - The x-coordinate of the point.
 * @param {number} py - The y-coordinate of the point.
 * @returns {boolean} True if the point is within the circle, otherwise false.
 */
function circleConainsPoint({cx, cy, r}, px, py)
{
    const vx = cx - px;
    const vy = cy - py;
    return vec2.dot([vx, vy], [vx, vy]) < Math.pow(r + EPSILON, 2);
}

/**
 * Determines if a point is within a given rectangle.
 * @param {object} rect - The x-coordinate of the rectangle's center.
 * @param {number} rect.cx - The x-coordinate of the rectangle's center.
 * @param {number} rect.cy - The y-coordinate of the rectangle's center.
 * @param {number} rect.width - The width of the rectangle.
 * @param {number} rect.height - The height of the rectangle.
 * @param {number} px - The x-coordinate of the point.
 * @param {number} py - The y-coordinate of the point.
 * @returns {boolean} True if the point is within the rectangle, otherwise false.
 */
function rectangleContainsPoint(rect, px, py){
    const {cx, cy, width, height} = rect;
    return cx-width/2.0  < px && px < cx+width/2.0 && 
           cy-height/2.0 < py && py < cy+height/2.0;
}

function hitSphericalLens(ray, {cx, cy, angle, diameter, centerThickness, edgeThickness})
{
    // make circles
    const top =         cy + diameter/2.0;
    const bottom =      cy - diameter/2.0;
    const edgeLeft =    cx - edgeThickness/2.0;
    const edgeRight =   cx + edgeThickness/2.0;
    const centerLeft =  cx - centerThickness/2.0
    const centerRight = cx + centerThickness/2.0

    // subshapes
    const leftCircle =  makeCircleFromThreePoints(
        vec2.rotate([edgeLeft,  top], angle, [cx,cy]), 
        vec2.rotate([centerLeft,  cy],  angle, [cx,cy]), 
        vec2.rotate([edgeLeft, bottom], angle, [cx,cy])
    );
    const rightCircle = makeCircleFromThreePoints(
        vec2.rotate([edgeRight, top],  angle, [cx,cy]), 
        vec2.rotate([centerRight, cy],  angle, [cx,cy]), 
        vec2.rotate([edgeRight, bottom], angle, [cx,cy])
    );
    const boundingBox = makeRectangle(cx, cy, angle, Math.max(centerThickness, edgeThickness), diameter);

    const IsConvex = centerThickness>edgeThickness;
    if(IsConvex){
        // hitspans
        const leftHitSpan = hitCircle(ray, leftCircle);
        const rightHitSpan = hitCircle(ray, rightCircle);
        const boundingSpan = hitRectangle(ray, makeRectangle(cx, cy, angle, Math.max(centerThickness, edgeThickness), diameter));
        return intersectSpan(boundingSpan, intersectSpan(leftHitSpan, rightHitSpan));
    }
    else{
        const boundingSpan = hitRectangle(ray, makeRectangle(cx, cy, angle, Math.max(centerThickness, edgeThickness), diameter));
        const leftHitSpan = hitCircle(ray, leftCircle);
        const rightHitSpan = hitCircle(ray, rightCircle);
        
        if(!boundingSpan){
            return null;
        }


        // return boundingSpan
        

        let span = boundingSpan;
        span = subtractSpan(span, leftHitSpan);
        span = subtractSpan(span, rightHitSpan);
        
        
        return span

        if(span.enter.t>span.exit.t){
            return null;
        }

        return span;


        span = subtractSpan(span, leftHitSpan)

        // const rightHitSpan = hitCircle(ray, rightCircle.cx, rightCircle.cy, rightCircle.r);
        // span = subtractSpan(span, rightHitSpan)

        return span;
    }
    
}

export {HitInfo, HitSpan}
export {makeCircle, makeRectangle, makeTriangle, makeLineSegment, makeSphericalLens};
export {collapseSpan, intersectSpan, subtractSpan, firstUnion};
export {hitCircle, hitLine, hitTriangle, hitSphericalLens, hitRectangle};