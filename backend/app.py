import sqlite3
from flask import Flask, request, jsonify, render_template, send_from_directory, session, redirect, url_for
from flask_cors import CORS
import os

# Configure Flask to serve static files/templates
app = Flask(__name__, static_folder='static', template_folder='templates')


app.secret_key = 'your_super_secret_key_gym_portal'
CORS(app)

DB_NAME = "gym.db"

def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        # Add new columns if not exist (simple migration for dev)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                plan_type TEXT NOT NULL,
                workout_type TEXT NOT NULL,
                expiry_date TEXT NOT NULL,
                payment_method TEXT,
                amount REAL,
                joining_date TEXT
            )
        ''')
        # Check if new columns exist, if not add them
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'payment_method' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN payment_method TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN amount REAL")
        if 'joining_date' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN joining_date TEXT")
        conn.commit()

# Serve Frontend
@app.route('/')
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        # Hardcoded credentials for simplicity
        if username == 'admin' and password == 'password123':
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            error = 'Invalid credentials. Please try again.'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        with sqlite3.connect(DB_NAME) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            rows = cursor.fetchall()
            users = [dict(row) for row in rows]
            return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users', methods=['POST'])
def add_user():
    try:
        data = request.json
        required_fields = ['name', 'email', 'phone', 'plan_type', 'workout_type', 'expiry_date']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (name, email, phone, plan_type, workout_type, expiry_date, payment_method, amount, joining_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['name'], 
                data['email'], 
                data['phone'], 
                data['plan_type'], 
                data['workout_type'], 
                data['expiry_date'],
                data.get('payment_method', 'Cash'),
                data.get('amount', 0.0),
                data.get('joining_date', '')
            ))
            conn.commit()
            return jsonify({"message": "User added successfully", "id": cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.json
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            # Dynamic update query
            fields = []
            values = []
            allowed_fields = ['name', 'email', 'phone', 'plan_type', 'workout_type', 'expiry_date', 'payment_method', 'amount', 'joining_date']
            for key in allowed_fields:
                if key in data:
                    fields.append(f"{key} = ?")
                    values.append(data[key])
            
            if not fields:
                return jsonify({"error": "No fields to update"}), 400
            
            values.append(user_id)
            query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
            
            if cursor.rowcount == 0:
                return jsonify({"error": "User not found"}), 404
                
            return jsonify({"message": "User updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            
            if cursor.rowcount == 0:
                return jsonify({"error": "User not found"}), 404
                
            return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run()

