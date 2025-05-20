package com.example.appcomu

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.text.SimpleDateFormat
import java.util.*

class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val channelId = "location_channel"
    private val domain = "artemis-s7.ddns.net"
    private val UDP_PORT = 6565

    override fun onCreate() {
        super.onCreate()
        startForegroundService()
        startLocationUpdates()
    }

    private fun startForegroundService() {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Location Service", NotificationManager.IMPORTANCE_LOW)
            notificationManager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tracking location")
            .setContentText("Enviando ubicación...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .build()

        startForeground(1, notification)
    }

    private fun startLocationUpdates() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L)
            .setMinUpdateIntervalMillis(10000L)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    val latitude = location.latitude
                    val longitude = location.longitude
                    val altitude = location.altitude
                    val timestamp = location.time
                    val formattedTime = SimpleDateFormat("yyyy-MM-dd - HH:mm:ss", Locale.getDefault()).format(Date(timestamp))
                    val message = "$latitude;$longitude;$altitude;$formattedTime"
                    Log.d("SERVICE_LOC", message)
                    sendUDP(domain, message)
                }
            }
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, null)
        }
    }

    private fun sendUDP(hostName: String, message: String) {
        Thread {
            try {
                val ip = InetAddress.getByName(hostName)
                val socket = DatagramSocket()
                val data = message.toByteArray()
                val packet = DatagramPacket(data, data.size, ip, UDP_PORT)
                socket.send(packet)
                socket.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
