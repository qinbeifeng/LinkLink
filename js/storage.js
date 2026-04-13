export class StorageManager {
    static LEADERBOARD_KEY = 'linklink_leaderboard_v2';
    static UNLOCKED_LEVELS_KEY = 'linklink_unlocked_levels';
    static LEVEL_STARS_KEY = 'linklink_level_stars';

    // --- Leaderboard Methods ---
    
    static saveScore(name, score, mode, category) {
        const leaderboard = this.getAllLeaderboards();
        if (!leaderboard[category]) leaderboard[category] = [];
        
        leaderboard[category].push({
            name: name || 'Anonymous',
            score: score,
            mode: mode,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        });
        
        // Sort descending by score
        leaderboard[category].sort((a, b) => b.score - a.score);
        
        // Keep top 10
        leaderboard[category] = leaderboard[category].slice(0, 10);
        
        localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(leaderboard));
    }

    static getAllLeaderboards() {
        const data = localStorage.getItem(this.LEADERBOARD_KEY);
        return data ? JSON.parse(data) : { 'BASIC': [], 'CASUAL': [], 'LEVEL': [] };
    }

    static getLeaderboard(category) {
        return this.getAllLeaderboards()[category] || [];
    }

    // --- Level Progress Methods ---

    static getUnlockedLevels() {
        const data = localStorage.getItem(this.UNLOCKED_LEVELS_KEY);
        return data ? JSON.parse(data) : [1];
    }

    static unlockLevel(level) {
        const unlocked = this.getUnlockedLevels();
        if (!unlocked.includes(level)) {
            unlocked.push(level);
            localStorage.setItem(this.UNLOCKED_LEVELS_KEY, JSON.stringify(unlocked));
            return true; // Newly unlocked
        }
        return false;
    }

    static isLevelUnlocked(level) {
        return this.getUnlockedLevels().includes(level);
    }

    // --- Star System Methods ---

    static saveLevelStars(level, stars) {
        const allStars = this.getAllLevelStars();
        if (!allStars[level] || stars > allStars[level]) {
            allStars[level] = stars;
            localStorage.setItem(this.LEVEL_STARS_KEY, JSON.stringify(allStars));
        }
    }

    static getAllLevelStars() {
        const data = localStorage.getItem(this.LEVEL_STARS_KEY);
        return data ? JSON.parse(data) : {};
    }

    static getLevelStars(level) {
        return this.getAllLevelStars()[level] || 0;
    }
}
