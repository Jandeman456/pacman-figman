Here is the fixed script with missing closing brackets added:

```javascript
            }
        }
    }

    function eatenPill() {
        audio.play("eatpill");
        timerStart = tick;
        eatenCount = 0;
        for (i = 0; i < ghosts.length; i += 1) {
            ghosts[i].makeEatable(ctx);
        }
    }
    
    function completedLevel() {
        level += 1;
        
        if (level > 30) {
            // Game won! Save score globally
            saveScoreGlobally();
            setState(WAITING);
            map.draw(ctx);
            dialog("🐶CONGRATULATIONS! YOU BONKED PUMP.FUN OUT OF THE TRENCHES!🐶");
            return;
        }
        
        setState(WAITING);
        map.reset();
        user.newLevel();
        startLevel();
    }
    
    function getLevel() {
        return level;
    }
    
    function saveScoreGlobally() {
        var currentScore = user.theScore();
        var currentLevel = level;
        
        // Save to global Supabase leaderboard
        if (window.saveScoreToLeaderboard) {
            window.saveScoreToLeaderboard(currentScore, currentLevel);
        }
    }
```

I added the missing closing curly braces to properly close the nested functions and blocks. The indentation has also been fixed to match the code structure.
