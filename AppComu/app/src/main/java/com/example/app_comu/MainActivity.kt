package com.example.AppComu

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.app_comu.R
import com.google.android.gms.location.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var tvLatitude: TextView
    private lateinit var tvLongitude: TextView
    private lateinit var tvAltitude: TextView    
    private lateinit var tvTimestamp: TextView
    private lateinit var message: String
    private val UDP_PORT = 6565
    private val domain = "artemis-s7.ddns.net"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvLatitude = findViewById(R.id.tv_latitude)
        tvLongitude = findViewById(R.id.tv_longitude)
        tvAltitude = findViewById(R.id.tv_altitude)
        tvTimestamp = findViewById(R.id.time_stamp)

        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        // Pedir permisos si no están concedidos
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 1)
        } else {
            startLocationUpdates()
        }
    }

    private fun startLocationUpdates() {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L)
            .setMinUpdateIntervalMillis(10000L)
            .build()

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    val latitude = location.latitude
                    val longitude = location.longitude
                    val altitude = location.altitude
                    val timestamp = location.time
                    val formattedTime = SimpleDateFormat("yyyy-MM-dd - HH:mm:ss", Locale.getDefault()).format(Date(timestamp))

                    tvTimestamp.text = "Time Stamp: $formattedTime"
                    tvLatitude.text = "Latitud: $latitude"
                    tvLongitude.text = "Longitud: $longitude"
                    tvAltitude.text = "Altitud: $altitude"
                    message = "$latitude;$longitude;$altitude;$formattedTime"
                    Log.d("LOCATION_UPDATE", message)
                    sendUDP(domain)
                }
            }
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, null)
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
