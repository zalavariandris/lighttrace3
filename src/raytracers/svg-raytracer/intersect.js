import * as vec2 from "./math-utils.js";

/* ray circle intersections*/
function Union(A, B)
{
    // closest enter
    const tEnter = A.tEnter;
    if(B.tEnter>0.0 && B.tEnter<tEnter) {tEnter = B.tEnter;}

    //farthest exit
    const tExit = A.tExit;
    if(B.tExit>0.0 && B.tExit<tExit){tExit = B.tExit;}

    return {tEnter, tExit};
}

function Intersection(A, B){
    //farthest enter
    const tEnter = A.tEnter;
    if(B.tEnter>0.0 && B.tEnter>tEnter) {tEnter = B.tEnter;}

    // closest exit
    const tExit = A.tExit;
    if(B.tExit>0.0 && B.tExit>tExit){tExit = B.tExit;}

    if(tExit?tEnter){
        return {tEnter: -1, tExit: -1};
    }
    return {tEnter, tExit};
}

function Difference(A, B)
{
    // closest enter
    const tEnter = A.tEnter;
    if(B.tExit>0.0 && B.tExit<tEnter) {tEnter = B.tExit;}

    //farthest exit
    const tExit = A.tExit;
    if(B.tEnter>0.0 && B.tEnter<tExit){tExit = B.tEnter;}

    return {tEnter, tExit};
}

function intersectCircle(ray, cx, cy, r)
{
    const ux = ray.x - cx;
    const uy = ray.y - cy;

    const B = vec2.dot([ux, uy], [ray.dx, ray.dy]);
    const C = vec2.dot([ux, uy], [ux, uy]) - r*r;
    const detSq = B*B - C;

    if (detSq >= 0.0)
    {
        const det = Math.sqrt(detSq);
        const tEnter = -B - det;
        const tExit  = -B + det;

        return {tEnter, tExit}
    }
    
    return {tEnter:-1, tExit:-1};
}

function intersectRectangle(ray, cx, cy, angle, width, height)
{
    let result = new HitInfo(9999, ray.x+ray.dx*9999, ray.y+ray.dy*9999, 0, 0, -1);

    const [rayX, rayY] = vec2.rotate(ray.x, ray.y, -angle, cx, cy);
    const [dirX, dirY] = vec2.rotate(ray.dx, ray.dy, -angle);

    const tNearX = (cx - width  / 2.0 - rayX) / dirX;
    const tNearY = (cy - height / 2.0 - rayY) / dirY;
    const tFarX =  (cx + width  / 2.0 - rayX) / dirX;
    const tFarY =  (cy + height / 2.0 - rayY) / dirY;

    const tEnter = Math.max(Math.min(tNearX, tFarX), Math.min(tNearY, tFarY));
    const tExit = Math.min(Math.max(tNearX, tFarX), Math.max(tNearY, tFarY));

    return {tEnter, tExit}
}