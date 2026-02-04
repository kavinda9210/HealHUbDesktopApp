import logging

from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

medication_bp = Blueprint('medication', __name__)


@medication_bp.route('/ping', methods=['GET'])
def medication_ping():
	"""Health endpoint for medication routes (placeholder)."""
	return jsonify({
		'success': True,
		'message': 'Medication routes are not implemented yet'
	}), 200

