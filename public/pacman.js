Here are the missing closing brackets and braces to fix the syntax errors:

```javascript
        }
    }

    function collided(user, ghost) {
        return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + 
                          Math.pow(ghost.y - user.y, 2))) < 10;
    }
```

The main issue was a missing closing brace `}` for the `loseLife()` function and a missing closing brace `}` for the `collided()` function definition.

The fixed code should now be syntactically complete and properly nested.