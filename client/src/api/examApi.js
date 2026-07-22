import axios from 'axios'

const API_BASE_URL = 'http://localhost:5001'

export const fetchQuestions = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/questions`)
        return response.data
    } catch (error) {
        console.error('Error fetching questions:', error)
        throw error
    }
}

export const submitAnswers = async (studentId, answers) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/submit`, {
            studentId,
            answers
        })
        return response.data
    } catch (error) {
        console.error('Error submitting answers:', error)
        throw error
    }
}

export const fetchSubmissions = async (studentId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/submissions/${studentId}`, {
            headers: { 'X-API-Key': import.meta.env.VITE_SUBMISSIONS_API_KEY }
        })
        return response.data
    } catch (error) {
        console.error('Error fetching submissions:', error)
        throw error
    }
}
