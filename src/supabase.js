import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Debug logging
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Make functions globally available
window.saveScoreToLeaderboard = saveScoreToLeaderboard;
window.getGlobalLeaderboard = getGlobalLeaderboard;

// Function to save score to global leaderboard
export async function saveScoreToLeaderboard(score, level) {
  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert([
        { score: score, level: level }
      ])
    
    if (error) {
      console.error('Error saving score:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error saving score:', error)
    return false
  }
}

// Function to get top 10 global scores
export async function getGlobalLeaderboard() {
  try {
    console.log('Fetching leaderboard...')
    const { data, error } = await supabase
      .from('leaderboard')
      .select('score, level, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching leaderboard:', error)
      console.error('Error details:', error.message, error.details)
      return []
    }
    
    console.log('Leaderboard data:', data)
    return data || []
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
}