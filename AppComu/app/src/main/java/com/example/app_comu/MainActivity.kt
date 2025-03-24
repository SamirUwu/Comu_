package com.example.AppComu

import android.widget.Toast
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*
import com.example.app_comu.R
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class MainActivity : AppCompatActivity() {

    private lateinit var locationManager: LocationManager
    private lateinit var tvLatitude: TextView
    private lateinit var tvLongitude: TextView
    private lateinit var tvTimestamp: TextView
    private lateinit var message: String
    private val UDP_PORT = 6565
    private val domain = "artemis-s9.ddns.net"


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvLatitude = findViewById(R.id.tv_latitude)
        tvLongitude = findViewById(R.id.tv_longitude)
        tvTimestamp = findViewById(R.id.time_stamp)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 1)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.SEND_SMS), 1)
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            getLocationManager()
            startLocationUpdates()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 1)
        }


    }

    private fun getLocationManager() {
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
    }

    private fun startLocationUpdates() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000L, 1f, object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    val latitude = location.latitude
                    val longitude = location.longitude
                    val timestamp = location.time // <-- Aquí se obtiene el timestamp del GPS
                    val formattedTime = SimpleDateFormat("yyyy-MM-dd - HH:mm:ss", Locale.getDefault()).format(Date(timestamp))

                    tvTimestamp.text = "Time Stamp: $formattedTime"
                    tvLatitude.text = "Latitud: $latitude"
                    tvLongitude.text = "Longitud: $longitude"
                    message = "$latitude;$longitude;$formattedTime"
                    Log.d("LOCATION_UPDATE", message)
                    sendUDP(domain)
                }

                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            })
        }
    }
    private fun resolveDomainName(hostName: String): String? {
        return try {
            val inetAddress = InetAddress.getByName(hostName)
            inetAddress.hostAddress
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    private fun showToast(message: String) {
        runOnUiThread {
            Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
        }
    }
    private fun sendUDP(hostName: String) {
        Thread {
            val ipAddress = resolveDomainName(hostName)
            if (ipAddress == null) {
                showToast("Failed to resolve DNS for UDP: $hostName")
                return@Thread
            }
            try {
                val socket = DatagramSocket()
                val address = InetAddress.getByName(ipAddress)
                val buf = message.toByteArray()
                val packet = DatagramPacket(buf, buf.size, address, UDP_PORT)
                socket.send(packet)
                socket.close()
                showToast("Data sent via UDP to $hostName ($ipAddress)")
            } catch (e: Exception) {
                e.printStackTrace()
                showToast("Error sending data via UDP to $hostName")
            }
        }.start()
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startLocationUpdates()
        }
    }
}