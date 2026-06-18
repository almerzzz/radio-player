from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stations')
def get_stations():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(base_dir, 'stations.json')
        
        with open(json_path, 'r', encoding='utf-8') as f:
            stations = json.load(f)
        # Оставляем только рабочие
        stations = [s for s in stations if s['name'] in ['Европа Плюс', 'DFM', 'Русское Радио']]
        return jsonify(stations)
    except Exception as e:
        return jsonify([]), 500

if __name__ == '__main__':
    # Для локальной разработки
    app.run(host='0.0.0.0', port=5000, debug=True)