import axios from 'axios'

const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
axios.defaults.baseURL = base
axios.defaults.timeout = 15000 // 15 s — prevents infinite spinner on cold-start backends

// Attach auth token automatically when present to avoid sending malformed headers
axios.interceptors.request.use((config) => {
	try{
		const token = localStorage.getItem('token')
		if (token && token !== 'null' && token !== 'undefined') {
			config.headers = config.headers || {}
			config.headers.Authorization = 'Bearer ' + token
		}
	}catch(e){ /* ignore */ }
	return config
})

export default axios
