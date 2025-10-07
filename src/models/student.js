const mongoose = require('mongoose')

const StudentSchema = mongoose.Schema({
	firstName: {
		type: String,
		required: [true, 'Your first name is required'],
		trim: true,
	},
	lastName: {
		type: String,
		required: [true, 'Your last name is required'],
		trim: true,
	},
	faculty: {
		type: String,
		required: [true, 'Your faculty is required'],
		trim: true,
	},
	group: {
		type: Number,
		required: true,
	},
	admissionYear: {
		type: Number,
		required: true,
		default: () => new Date().getFullYear(),
	},
	hometown: {
		city: {
			type: String,
			required: [true, 'Your city is required'],
			trim: true,
		},
		region: {
			type: String,
			trim: true,
		},
		location: {
			type: {
				type: String,
				enum: ['Point'],
				default: 'Point',
			},
			coordinates: {
				type: [Number],
				required: true,
			},
		},
	},
	admissionScores: {
		avgScore: {
			type: Number,
			required: [true, 'Average score is required'],
			min: 0,
			max: 100,
		},
		examScore: {
			type: Map,
			of: {
				type: Number,
				min: [0, 'Score cannot be less than 0'],
				max: [100, 'Score cannot be more than 100'],
			},
			required: [true, 'Exam score is required'],
		},
	},
	status: {
		type: String,
		enum: ['active', 'graduated', 'expelled'],
		default: 'graduated',
	},
	grades: {
		type: Map,
		of: {
			type: Number,
			min: [0, 'Score cannot be less than 0'],
			max: [10, 'Score cannot be more than 10'],
		},
	},
    socialStatus: {
        type: Number,
        default: 0x00,
    }
})

StudentSchema.index({ 'hometown.location': '2dsphere' })

const SocialFlags = {
	LOST_BREADWINNER: 0x01,
	STATE_SUPPORT: 0x02,
	ORPHAN: 0x04,
	DISABLED: 0x08,
}

module.exports = mongoose.model('Student', StudentSchema)