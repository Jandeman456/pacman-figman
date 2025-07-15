Here are the missing closing brackets and braces I've identified and added:

1. In the `move` function of the `User` class, there's a missing closing brace for the collision detection block:
```javascript
if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) {
    // Hit a wall, stop moving
    return {"new" : position, "old" : position};
} else {
    // Can't move in any direction, stay put
    npos = position;
}
```

2. In the `isMidSquare` function, there was a missing closing brace for the block checking dot collection:
```javascript
if ((isMidSquare(position.y) || isMidSquare(position.x)) && block) {
    // Dot collection logic
}
```

The file should now be syntactically complete with all matching brackets and braces. Let me know if you need any clarification or if there are other issues to address.