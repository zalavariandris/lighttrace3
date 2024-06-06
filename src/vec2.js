function add([x1,y1], [x2,y2])
{
    return [x1+x2, y1+y2];
}

function sub([x1,y1], [x2,y2])
{
    return [x1-x2, y1-y2];
}

function mult([x1,y1], b)
{
    if(Array.isArray(b)){
        return [x1*s[0], y1+s[1]];
    }
    return [x1*b, y1+b];
}

function rotate([x, y], radAngle, [pivotX, pivotY]=[0.0,0.0])
{
    const rX = pivotX + (x - pivotX) * Math.cos(radAngle) - (y - pivotY) * Math.sin(radAngle);
    const rY = pivotY + (x - pivotX) * Math.sin(radAngle) + (y - pivotY) * Math.cos(radAngle);

    return [rX, rY];
}

function dot([x1,y1], [x2,y2])
{
    return x1*x2 + y1*y2;
}

function normalize(x, y)
{
    const magnitude = Math.sqrt(x * x + y * y);
    if(magnitude===0) throw new Error("Cannot normalize a zero vector");
    return [x / magnitude, y / magnitude];
}

export {add, sub, mult, rotate, dot, normalize}