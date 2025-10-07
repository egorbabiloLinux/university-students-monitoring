const Student = require('../models/student')
const logger = require('../logger')

exports.createStudentsControllers = function() {
    return {
        geojson: async (req, res) => {
            let response
            try {
                const students = await Student.find({})
                geoJson = {
                    type: 'FeatureCollection',
                    features: students.map(student => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: student.hometown.location.coordinates
                        },
                        properties: {
                            name: `${student.firstName} ${student.lastName}`,
                            faculty: student.faculty
                        }
                    }))
                }
                response = {
                    error: false, 
                    data: geoJson
                }
                logger.info('Students geo sent')
                res.status(200).json(response)
            } catch(err) {
                response = {
                    error: true, 
                    msg: 'Internal server error'
                }
                logger.error({ response, err }, 'Server error')
                res.status(500).json(response)
            }
        }
    }
}