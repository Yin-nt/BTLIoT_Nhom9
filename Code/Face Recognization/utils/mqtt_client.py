# utils/mqtt_client.py
import paho.mqtt.client as mqtt
import json
import time
from threading import Lock

class MQTTClient:
    def __init__(self, broker="localhost", port=1883, username=None, password=None):
        """
        Khởi tạo MQTT Client
        
        Args:
            broker: Địa chỉ MQTT broker (ví dụ: "192.168.1.100" hoặc "broker.hivemq.com")
            port: Cổng MQTT (mặc định: 1883)
            username: Username authentication (optional)
            password: Password authentication (optional)
        """
        self.broker = broker
        self.port = port
        self.client = mqtt.Client()
        self.connected = False
        self.lock = Lock()
        
        # Cấu hình authentication nếu có
        if username and password:
            self.client.username_pw_set(username, password)
        
        # Callback khi kết nối thành công
        self.client.on_connect = self._on_connect
        
        # Callback khi mất kết nối
        self.client.on_disconnect = self._on_disconnect
        
        # Tự động kết nối
        self._connect()
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ MQTT Connected to {self.broker}:{self.port}")
            self.connected = True
        else:
            print(f"❌ MQTT Connection failed with code {rc}")
            self.connected = False
    
    def _on_disconnect(self, client, userdata, rc):
        print(f"⚠️ MQTT Disconnected (code: {rc})")
        self.connected = False
        if rc != 0:
            print("🔄 Attempting to reconnect...")
            self._connect()
    
    def _connect(self):
        try:
            print(f"🔌 Connecting to MQTT broker: {self.broker}:{self.port}...")
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()  # Chạy loop trong background thread
        except Exception as e:
            print(f"❌ MQTT Connection error: {e}")
            self.connected = False
    
    def publish(self, topic, payload, qos=1, retain=False):
        """
        Publish message lên MQTT broker
        
        Args:
            topic: Topic để publish (ví dụ: "iot/door/verify/result")
            payload: Dữ liệu (dict sẽ tự động convert sang JSON)
            qos: Quality of Service (0, 1, 2)
            retain: Giữ message cuối cùng trên broker
        
        Returns:
            True nếu publish thành công, False nếu thất bại
        """
        with self.lock:
            if not self.connected:
                print("⚠️ MQTT not connected, attempting reconnect...")
                self._connect()
                time.sleep(1)  # Đợi kết nối
                if not self.connected:
                    print("❌ MQTT publish failed: Not connected")
                    return False
            
            try:
                # Convert dict sang JSON string (ensure_ascii=False để giữ tiếng Việt)
                if isinstance(payload, dict):
                    payload = json.dumps(payload, ensure_ascii=False)
                
                result = self.client.publish(topic, payload, qos=qos, retain=retain)
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    print(f"📤 MQTT Published to '{topic}': {payload}")
                    return True
                else:
                    print(f"❌ MQTT Publish failed with code {result.rc}")
                    return False
            except Exception as e:
                print(f"❌ MQTT Publish error: {e}")
                return False
    
    def disconnect(self):
        """Ngắt kết nối MQTT"""
        self.client.loop_stop()
        self.client.disconnect()
        print("🔌 MQTT Disconnected")

# Singleton instance
_mqtt_instance = None

def get_mqtt_client(broker="localhost", port=1883, username=None, password=None):
    """
    Lấy singleton instance của MQTT client
    
    Usage:
        mqtt = get_mqtt_client(broker="192.168.1.100", port=1883)
        mqtt.publish("iot/door/status", {"status": "locked"})
    """
    global _mqtt_instance
    if _mqtt_instance is None:
        _mqtt_instance = MQTTClient(broker, port, username, password)
    return _mqtt_instance
