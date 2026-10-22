import os
from flask import Blueprint, render_template, redirect, request, jsonify
from capability import Capability

path = Blueprint('path', __name__)

_MODELS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/model.json')
_capability  = Capability(_MODELS_PATH)


@path.route('/')
def start():
    return redirect('/home')


@path.route('/home')
def home():
    return render_template('home.html')


@path.route('/howtojson')
def howto():
    return render_template('howtojson.html')


@path.route('/createModel', methods=['GET', 'POST'])
def createModel():
    return render_template('createModel.html')


@path.route('/createcall')
def view_createcall():
    return render_template('createcall.html')


@path.route('/call')
def view_call():
    return render_template('call.html')


# ── API ────────────────────────────────────────────────────────────────────────

@path.route('/api/models')
def api_models():
    """Return the full room-model list as JSON (used by home + createcall pages)."""
    return jsonify(_capability.model)


# ── Auth stubs ─────────────────────────────────────────────────────────────────

@path.route('/cadastro', methods=['GET', 'POST'])
def view_signup():
    if request.method == 'GET':
        return redirect('/home?action=cadastro')
    return 'Cadastro não implementado', 501


@path.route('/login', methods=['GET', 'POST'])
def view_temporary_login():
    return 'Invalid login', 400
