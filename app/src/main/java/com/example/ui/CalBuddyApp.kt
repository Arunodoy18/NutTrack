package com.example.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material3.surfaceColorAtElevation
import com.example.model.FoodItem
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.model.DailyTotals
import com.example.model.MealAnalysis
import com.example.model.SavedMeal
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.scale
import androidx.compose.material3.Switch
import androidx.compose.runtime.LaunchedEffect

enum class AppTab { SCAN, HISTORY, INSIGHTS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalBuddyApp(
    viewModel: CalBuddyViewModel = viewModel()
) {
    val context = LocalContext.current
    var currentTab by remember { mutableStateOf(AppTab.SCAN) }
    
    val analysisState by viewModel.analysisState.collectAsState()
    val dailyTotals by viewModel.dailyTotals.collectAsState()
    val savedMeals by viewModel.savedMeals.collectAsState()
    val selectedBitmap by viewModel.selectedImageBitmap.collectAsState()
    val nutrientTargets by viewModel.nutrientTargets.collectAsState()

    var showSettingsDialog by remember { mutableStateOf(false) }

    // Daily nutritional targets (benchmarks)
    val targetCalories = nutrientTargets.calories
    val targetProtein = nutrientTargets.protein
    val targetFat = nutrientTargets.fat
    val targetFiber = nutrientTargets.fiber

    // Photo picker launcher
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val bitmap = uriToBitmap(context, it)
            if (bitmap != null) {
                viewModel.setSelectedImage(bitmap)
            }
        }
    }

    var tempPhotoUri by remember { mutableStateOf<Uri?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            tempPhotoUri?.let { uri ->
                val bitmap = uriToBitmap(context, uri)
                if (bitmap != null) {
                    viewModel.setSelectedImage(bitmap)
                }
            }
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            val uri = createTempPictureUri(context)
            tempPhotoUri = uri
            cameraLauncher.launch(uri)
        } else {
            android.widget.Toast.makeText(context, "Camera permission is required to capture photos.", android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    val isPaywallOpen by viewModel.isPaywallOpen.collectAsState()

    if (showSettingsDialog) {
        SettingsDialog(
            initialTargets = nutrientTargets,
            viewModel = viewModel,
            onDismiss = { showSettingsDialog = false },
            onSave = { newTargets -> viewModel.updateNutrientTargets(newTargets) }
        )
    }

    if (isPaywallOpen) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissPaywall() },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "Premium Icon",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Upgrade to dietBuddy Premium",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "You have reached the free limit of 3 scans per day.",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    Text(
                        text = "Unlock dietBuddy Premium for ₹199/month to get:",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("• Unlimited AI food & macro scans", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        Text("• Two-way mobile-web cloud sync", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        Text("• Comprehensive progress metrics", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.setPremium(true)
                        viewModel.dismissPaywall()
                    }
                ) {
                    Text("Subscribe for ₹199/mo")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { viewModel.dismissPaywall() }) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(28.dp),
            containerColor = MaterialTheme.colorScheme.surface
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                modifier = Modifier.background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.background,
                            MaterialTheme.colorScheme.surfaceColorAtElevation(1.dp)
                        )
                    )
                ),
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    brush = Brush.linearGradient(
                                        colors = listOf(
                                            Color(0xFF22D3EE), // Cyan
                                            Color(0xFF10B981)  // Emerald
                                        )
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "d",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                modifier = Modifier.offset(y = (-1).dp)
                            )
                        }
                        Text(
                            text = "dietBuddy",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showSettingsDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Goals Settings",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(onClick = { viewModel.resetTodayTotals() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Reset Totals",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = CircleShape,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "JD",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = (currentTab == AppTab.SCAN),
                    onClick = { currentTab = AppTab.SCAN },
                    icon = { Icon(imageVector = Icons.Default.Favorite, contentDescription = "Scan") },
                    label = { Text("Scan / Log") }
                )
                NavigationBarItem(
                    selected = (currentTab == AppTab.HISTORY),
                    onClick = { currentTab = AppTab.HISTORY },
                    icon = { Icon(imageVector = Icons.Default.List, contentDescription = "History") },
                    label = { Text("History") }
                )
                NavigationBarItem(
                    selected = (currentTab == AppTab.INSIGHTS),
                    onClick = { currentTab = AppTab.INSIGHTS },
                    icon = { Icon(imageVector = Icons.Default.Star, contentDescription = "Insights") },
                    label = { Text("Insights") }
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                AppTab.SCAN -> {
                    ScanTabContent(
                        viewModel = viewModel,
                        targetCalories = targetCalories,
                        targetProtein = targetProtein,
                        targetFat = targetFat,
                        targetFiber = targetFiber,
                        onPickClick = { imagePickerLauncher.launch("image/*") },
                        onCameraClick = {
                            val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
                                context,
                                android.Manifest.permission.CAMERA
                            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

                            if (hasPermission) {
                                val uri = createTempPictureUri(context)
                                tempPhotoUri = uri
                                cameraLauncher.launch(uri)
                            } else {
                                cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                            }
                        },
                        analysisState = analysisState,
                        dailyTotals = dailyTotals,
                        selectedBitmap = selectedBitmap,
                        savedMeals = savedMeals
                    )
                }
                AppTab.HISTORY -> {
                    HistoryTabContent(
                        viewModel = viewModel,
                        savedMeals = savedMeals
                    )
                }
                AppTab.INSIGHTS -> {
                    InsightsTabContent(
                        viewModel = viewModel,
                        nutrientTargets = nutrientTargets,
                        dailyTotals = dailyTotals,
                        savedMeals = savedMeals
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanTabContent(
    viewModel: CalBuddyViewModel,
    targetCalories: Int,
    targetProtein: Int,
    targetFat: Int,
    targetFiber: Int,
    onPickClick: () -> Unit,
    onCameraClick: () -> Unit,
    analysisState: AnalysisState,
    dailyTotals: DailyTotals,
    selectedBitmap: Bitmap?,
    savedMeals: List<com.example.model.SavedMeal>
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 40.dp)
    ) {
        // Premium Dynamic Greeting and Prompt
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
                val dayGreeting = when (hour) {
                    in 0..11 -> "Good Morning"
                    in 12..16 -> "Good Afternoon"
                    else -> "Good Evening"
                }

                Text(
                    text = "$dayGreeting, John",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "Ready to fuel your goals?",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)
                )
            }
        }

        // Daily Cumulative Stat Widget
        item {
            DailyTrackerWidget(
                current = dailyTotals,
                targetCal = targetCalories,
                targetProtein = targetProtein,
                targetFat = targetFat,
                targetFiber = targetFiber,
                onResetClick = { viewModel.resetTodayTotals() }
            )
        }


        // Photo picker Box Area
        item {
            MealUploadWidget(
                selectedBitmap = selectedBitmap,
                onPickClick = onPickClick,
                onCameraClick = onCameraClick,
                onClearClick = { viewModel.setSelectedImage(null) }
            )
        }

        // Direct Manual Logging
        if (selectedBitmap == null && analysisState is AnalysisState.Idle) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "— OR —",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { viewModel.startManualMeal() },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    ) {
                        Text("Create Manual Meal Log", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }

            item {
                RemindersCard()
            }
        }

        // Analysis Action Trigger & Status/Results Box
        item {
            AnimatedVisibility(
                visible = selectedBitmap != null || analysisState !is AnalysisState.Idle,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(26.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        when (analysisState) {
                            is AnalysisState.Idle -> {
                                Button(
                                    onClick = { viewModel.analyzeMeal() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary,
                                        contentColor = Color.White
                                    )
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Star,
                                        contentDescription = "Analyze Icon",
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Analyze Meal with AI", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                }
                            }

                            is AnalysisState.Loading -> {
                                var currentTextIndex by remember { mutableStateOf(0) }
                                val customMessages = listOf(
                                    "Detecting culinary ingredients...",
                                    "Estimating portion weights & sizes...",
                                    "Calculating protein & fibers...",
                                    "Consulting USDA databases...",
                                    "Formulating coaching suggestions..."
                                )
                                LaunchedEffect(Unit) {
                                    while (true) {
                                        kotlinx.coroutines.delay(1800)
                                        currentTextIndex = (currentTextIndex + 1) % customMessages.size
                                    }
                                }

                                val infiniteTransition = rememberInfiniteTransition()
                                val yPositionFraction by infiniteTransition.animateFloat(
                                    initialValue = 0f,
                                    targetValue = 1f,
                                    animationSpec = infiniteRepeatable(
                                        animation = tween(1800, easing = androidx.compose.animation.core.LinearEasing),
                                        repeatMode = RepeatMode.Reverse
                                    )
                                )

                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 12.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    // Highlight scanning beam box
                                    Box(
                                        modifier = Modifier
                                            .size(200.dp, 130.dp)
                                            .clip(RoundedCornerShape(20.dp))
                                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)), RoundedCornerShape(20.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (selectedBitmap != null) {
                                            Image(
                                                bitmap = selectedBitmap.asImageBitmap(),
                                                contentDescription = "Scanning visual",
                                                modifier = Modifier.fillMaxSize(),
                                                contentScale = ContentScale.Crop
                                            )
                                        } else {
                                            Icon(
                                                imageVector = Icons.Default.Favorite,
                                                contentDescription = "Nutrition scan",
                                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                                                modifier = Modifier.size(54.dp)
                                            )
                                        }

                                        // Animated Laser Sweeper Element
                                        val lineY = 130.dp * yPositionFraction
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(3.dp)
                                                .align(Alignment.TopCenter)
                                                .offset(y = lineY)
                                                .background(
                                                    Brush.horizontalGradient(
                                                        listOf(
                                                            Color.Transparent,
                                                            Color(0xFF22D3EE),
                                                            Color(0xFF10B981),
                                                            Color(0xFF22D3EE),
                                                            Color.Transparent
                                                        )
                                                    )
                                                )
                                                .shadow(
                                                    elevation = 8.dp,
                                                    shape = RoundedCornerShape(2.dp),
                                                    ambientColor = Color(0xFF22D3EE),
                                                    spotColor = Color(0xFF10B981)
                                                )
                                        )
                                    }

                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = customMessages[currentTextIndex],
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary,
                                            textAlign = TextAlign.Center
                                        )
                                        Text(
                                            text = "Wait a few seconds for AI dissection",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                            textAlign = TextAlign.Center
                                        )
                                    }

                                    LinearProgressIndicator(
                                        color = MaterialTheme.colorScheme.primary,
                                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                        modifier = Modifier
                                            .width(140.dp)
                                            .height(4.dp)
                                            .clip(CircleShape)
                                    )
                                }
                            }

                            is AnalysisState.Error -> {
                                val errorMsg = (analysisState as AnalysisState.Error).message
                                Column(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Error icon",
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.size(36.dp)
                                    )
                                    Text(
                                        text = errorMsg,
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 14.sp,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(horizontal = 8.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = { viewModel.setSelectedImage(null) },
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("Reset")
                                        }
                                        Button(
                                            onClick = { viewModel.analyzeMeal() },
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("Try Again")
                                        }
                                    }
                                }
                            }

                            is AnalysisState.Success -> {
                                val activeMeal by viewModel.activeEditingMeal.collectAsState()
                                activeMeal?.let { meal ->
                                    MealAnalysisResultWidget(
                                        analysis = meal,
                                        onAddToDailyTotal = {
                                            viewModel.addMealToDailyTotals(meal)
                                        },
                                        viewModel = viewModel
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun exportHistoryToCsv(context: Context, meals: List<SavedMeal>) {
    val csvHeader = "ID,Date,Summary,Total Calories (kcal),Total Protein (g),Total Fat (g),Total Fiber (g),Food Breakdown\n"
    val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    
    val csvRows = StringBuilder(csvHeader)
    for (meal in meals) {
        val dateStr = dateFormat.format(Date(meal.timestamp))
        val summaryEscaped = meal.analysis.summary.replace("\"", "\"\"")
        
        // build foods breakdown string: item1 (cal, prot, fat, fib) | item2 ...
        val breakdown = meal.analysis.foods.joinToString(" | ") { food ->
            "${food.name} (cal: ${food.calories}, prot: ${food.protein}g, fat: ${food.fat}g, fib: ${food.fiber}g)"
        }.replace("\"", "\"\"")
        
        csvRows.append("${meal.id},\"$dateStr\",\"$summaryEscaped\",${meal.analysis.totalCalories},${meal.analysis.totalProtein},${meal.analysis.totalFat},${meal.analysis.totalFiber},\"$breakdown\"\n")
    }

    try {
        val cacheFile = java.io.File(context.cacheDir, "calbuddy_meal_history.csv")
        cacheFile.writeText(csvRows.toString())
        
        val uri = androidx.core.content.FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            cacheFile
        )
        
        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(android.content.Intent.EXTRA_STREAM, uri)
            putExtra(android.content.Intent.EXTRA_SUBJECT, "dietBuddy Meal History Export")
            putExtra(android.content.Intent.EXTRA_TEXT, "Here is your exported meal log history from dietBuddy!")
            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        
        context.startActivity(android.content.Intent.createChooser(shareIntent, "Export & Save CSV"))
    } catch (e: Exception) {
        android.util.Log.e("HistoryTabContent", "Failed to export CSV file", e)
    }
}

@Composable
fun HistoryTabContent(
    viewModel: CalBuddyViewModel,
    savedMeals: List<SavedMeal>
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    
    val filteredMeals = remember(searchQuery, savedMeals) {
        if (searchQuery.trim().isEmpty()) {
            savedMeals
        } else {
            val q = searchQuery.lowercase()
            savedMeals.filter { meal ->
                meal.analysis.foods.any { it.name.lowercase().contains(q) } ||
                meal.analysis.summary.lowercase().contains(q)
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Meal Logs History",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Chronological archive & breakdown of your daily meals.",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)
                        )
                    }
                    if (savedMeals.isNotEmpty()) {
                        OutlinedButton(
                            onClick = { exportHistoryToCsv(context, savedMeals) },
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            modifier = Modifier.height(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Export History to CSV",
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Export CSV", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search logs by food name or summary...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search icon", modifier = Modifier.size(18.dp)) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear search", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            )
        }

        if (filteredMeals.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Meal Entries (${filteredMeals.size})",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Clear All",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .clickable { viewModel.clearHistory() }
                            .padding(4.dp)
                    )
                }
            }

            items(
                items = filteredMeals,
                key = { it.id }
            ) { savedMeal ->
                SavedMealLogCard(
                    savedMeal = savedMeal,
                    onDeleteClick = { viewModel.deleteSavedMeal(savedMeal.id) }
                )
            }
        } else {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "No results",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                            modifier = Modifier.size(36.dp)
                        )
                        Text(
                            text = if (searchQuery.isNotEmpty()) "No entries found matching\n\"$searchQuery\"" else "No meal logs found.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )
                        if (searchQuery.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            OutlinedButton(
                                onClick = { searchQuery = "" },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Clear Search")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DailyTrackerWidget(
    current: DailyTotals,
    targetCal: Int,
    targetProtein: Int,
    targetFat: Int,
    targetFiber: Int,
    onResetClick: (() -> Unit)? = null
) {
    val calProgress = (current.calories.toFloat() / targetCal.toFloat()).coerceIn(0f, 1f)
    val protProgress = (current.protein.toFloat() / targetProtein.toFloat()).coerceIn(0f, 1f)
    val fatProgress = (current.fat.toFloat() / targetFat.toFloat()).coerceIn(0f, 1f)
    val fibProgress = (current.fiber.toFloat() / targetFiber.toFloat()).coerceIn(0f, 1f)

    val calProgressAnimated by animateFloatAsState(
        targetValue = calProgress,
        animationSpec = tween(1200, easing = androidx.compose.animation.core.FastOutSlowInEasing)
    )
    val protProgressAnimated by animateFloatAsState(
        targetValue = protProgress,
        animationSpec = tween(1300, easing = androidx.compose.animation.core.FastOutSlowInEasing)
    )
    val fatProgressAnimated by animateFloatAsState(
        targetValue = fatProgress,
        animationSpec = tween(1400, easing = androidx.compose.animation.core.FastOutSlowInEasing)
    )
    val fibProgressAnimated by animateFloatAsState(
        targetValue = fibProgress,
        animationSpec = tween(1500, easing = androidx.compose.animation.core.FastOutSlowInEasing)
    )

    val animatedCalories by animateIntAsState(
        targetValue = current.calories,
        animationSpec = tween(1200, easing = androidx.compose.animation.core.FastOutSlowInEasing)
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Left: Custom concentric progress rings circular chart
                Box(
                    modifier = Modifier
                        .size(110.dp),
                    contentAlignment = Alignment.Center
                ) {
                    DailyTrackerRings(
                        calProgress = calProgressAnimated,
                        protProgress = protProgressAnimated,
                        fatProgress = fatProgressAnimated,
                        fibProgress = fibProgressAnimated
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${(calProgressAnimated * 100).toInt()}%",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onSurface,
                            lineHeight = 20.sp
                        )
                        Text(
                            text = "Cal Met",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                        )
                    }
                }

                // Right: Detailed numeric stats
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "TODAY'S CALORIES",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Surface(
                            color = if (current.calories <= targetCal) MaterialTheme.colorScheme.primaryContainer else Color(0xFFFEE2E2),
                            shape = CircleShape,
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Icon(
                                    imageVector = if (current.calories <= targetCal) Icons.Default.Check else Icons.Default.Warning,
                                    contentDescription = "Status",
                                    tint = if (current.calories <= targetCal) MaterialTheme.colorScheme.primary else Color(0xFFEF4444),
                                    modifier = Modifier.size(10.dp)
                                )
                                Text(
                                    text = if (current.calories <= targetCal) "On Track" else "Over Target",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (current.calories <= targetCal) MaterialTheme.colorScheme.primary else Color(0xFFB91C1C)
                                )
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = "$animatedCalories",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            lineHeight = 32.sp
                        )
                        Text(
                            text = "/ $targetCal kcal",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.padding(bottom = 3.dp)
                        )
                    }

                    LinearProgressIndicator(
                        progress = { calProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(CircleShape),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    )
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                MacroStatColumn(
                    modifier = Modifier.weight(1f),
                    label = "Protein",
                    current = current.protein,
                    target = targetProtein,
                    progress = protProgress,
                    isHighlighted = true,
                    barColor = Color(0xFF10B981)
                )
                MacroStatColumn(
                    modifier = Modifier.weight(1f),
                    label = "Fat",
                    current = current.fat,
                    target = targetFat,
                    progress = fatProgress,
                    isHighlighted = false,
                    barColor = Color(0xFFF59E0B)
                )
                MacroStatColumn(
                    modifier = Modifier.weight(1f),
                    label = "Fiber",
                    current = current.fiber,
                    target = targetFiber,
                    progress = fibProgress,
                    isHighlighted = false,
                    barColor = Color(0xFF3B82F6)
                )
            }
            if (onResetClick != null) {
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onResetClick,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.35f)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Reset Icon",
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Reset Daily Totals", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun DailyTrackerRings(
    calProgress: Float,
    protProgress: Float,
    fatProgress: Float,
    fibProgress: Float,
    modifier: Modifier = Modifier
) {
    val calColor = MaterialTheme.colorScheme.primary
    val protColor = Color(0xFF10B981) // Green
    val fatColor = Color(0xFFF59E0B)  // Orange/Amber
    val fibColor = Color(0xFF3B82F6)  // Blue

    Canvas(modifier = modifier.fillMaxSize()) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val strokeWidthPx = 7.dp.toPx()
        val spacingPx = 3.dp.toPx()

        // Ring 1: Calories (Outer)
        val radius1 = (size.minDimension / 2f) - strokeWidthPx
        drawCircle(
            color = calColor.copy(alpha = 0.08f),
            radius = radius1,
            center = center,
            style = Stroke(width = strokeWidthPx)
        )
        drawArc(
            color = calColor,
            startAngle = -90f,
            sweepAngle = calProgress * 360f,
            useCenter = false,
            topLeft = Offset(center.x - radius1, center.y - radius1),
            size = Size(radius1 * 2f, radius1 * 2f),
            style = Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
        )

        // Ring 2: Protein
        val radius2 = radius1 - strokeWidthPx - spacingPx
        drawCircle(
            color = protColor.copy(alpha = 0.08f),
            radius = radius2,
            center = center,
            style = Stroke(width = strokeWidthPx)
        )
        drawArc(
            color = protColor,
            startAngle = -90f,
            sweepAngle = protProgress * 360f,
            useCenter = false,
            topLeft = Offset(center.x - radius2, center.y - radius2),
            size = Size(radius2 * 2f, radius2 * 2f),
            style = Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
        )

        // Ring 3: Fat
        val radius3 = radius2 - strokeWidthPx - spacingPx
        drawCircle(
            color = fatColor.copy(alpha = 0.08f),
            radius = radius3,
            center = center,
            style = Stroke(width = strokeWidthPx)
        )
        drawArc(
            color = fatColor,
            startAngle = -90f,
            sweepAngle = fatProgress * 360f,
            useCenter = false,
            topLeft = Offset(center.x - radius3, center.y - radius3),
            size = Size(radius3 * 2f, radius3 * 2f),
            style = Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
        )

        // Ring 4: Fiber (Innermost)
        val radius4 = radius3 - strokeWidthPx - spacingPx
        drawCircle(
            color = fibColor.copy(alpha = 0.08f),
            radius = radius4,
            center = center,
            style = Stroke(width = strokeWidthPx)
        )
        drawArc(
            color = fibColor,
            startAngle = -90f,
            sweepAngle = fibProgress * 360f,
            useCenter = false,
            topLeft = Offset(center.x - radius4, center.y - radius4),
            size = Size(radius4 * 2f, radius4 * 2f),
            style = Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
        )
    }
}

@Composable
fun RemindersCard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("calbuddy_reminders_prefs", Context.MODE_PRIVATE) }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted -> }
    )

    var breakfastEnabled by remember { mutableStateOf(prefs.getBoolean("reminder_breakfast", false)) }
    var lunchEnabled by remember { mutableStateOf(prefs.getBoolean("reminder_lunch", false)) }
    var dinnerEnabled by remember { mutableStateOf(prefs.getBoolean("reminder_dinner", false)) }

    LaunchedEffect(breakfastEnabled) {
        prefs.edit().putBoolean("reminder_breakfast", breakfastEnabled).apply()
        if (breakfastEnabled) {
            ReminderReceiver.scheduleReminder(context, "Breakfast", 8, 0)
        } else {
            ReminderReceiver.cancelReminder(context, "Breakfast")
        }
    }

    LaunchedEffect(lunchEnabled) {
        prefs.edit().putBoolean("reminder_lunch", lunchEnabled).apply()
        if (lunchEnabled) {
            ReminderReceiver.scheduleReminder(context, "Lunch", 13, 0)
        } else {
            ReminderReceiver.cancelReminder(context, "Lunch")
        }
    }

    LaunchedEffect(dinnerEnabled) {
        prefs.edit().putBoolean("reminder_dinner", dinnerEnabled).apply()
        if (dinnerEnabled) {
            ReminderReceiver.scheduleReminder(context, "Dinner", 20, 0)
        } else {
            ReminderReceiver.cancelReminder(context, "Dinner")
        }
    }

    fun checkAndRequestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Reminders icon",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Column {
                    Text(
                        text = "Meal Log Reminders",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Daily schedule for system notifications.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                    )
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ReminderToggleRow(
                    label = "Breakfast (8:00 AM)",
                    description = "Keep morning macronutrients tracked.",
                    checked = breakfastEnabled,
                    onCheckedChange = {
                        checkAndRequestPermission()
                        breakfastEnabled = it
                    }
                )

                ReminderToggleRow(
                    label = "Lunch (1:00 PM)",
                    description = "Log midday fuels with AI analyzer.",
                    checked = lunchEnabled,
                    onCheckedChange = {
                        checkAndRequestPermission()
                        lunchEnabled = it
                    }
                )

                ReminderToggleRow(
                    label = "Dinner (8:00 PM)",
                    description = "Wrap up daily goals and history.",
                    checked = dinnerEnabled,
                    onCheckedChange = {
                        checkAndRequestPermission()
                        dinnerEnabled = it
                    }
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

            var testReminderSent by remember { mutableStateOf(false) }
            LaunchedEffect(testReminderSent) {
                if (testReminderSent) {
                    kotlinx.coroutines.delay(2000)
                    testReminderSent = false
                }
            }

            Button(
                onClick = {
                    checkAndRequestPermission()
                    ReminderReceiver.showNotification(context, "General")
                    testReminderSent = true
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            ) {
                Text(
                    text = if (testReminderSent) "✓ Notification Fired!" else "Send Instant Test Notification",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
        }
    }
}

@Composable
fun ReminderToggleRow(
    label: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = description,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            modifier = Modifier.scale(0.85f)
        )
    }
}

@Composable
fun MacroStatColumn(
    modifier: Modifier = Modifier,
    label: String,
    current: Int,
    target: Int,
    progress: Float,
    isHighlighted: Boolean,
    barColor: Color
) {
    val containerColor = if (isHighlighted) Color(0xFFECFDF5) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.40f)
    val borderColor = if (isHighlighted) Color(0xFFD1FAE5) else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
    val labelColor = if (isHighlighted) Color(0xFF047857) else MaterialTheme.colorScheme.onSurfaceVariant
    val textColor = if (isHighlighted) Color(0xFF047857) else MaterialTheme.colorScheme.onSurface

    Surface(
        modifier = modifier,
        color = containerColor,
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = labelColor
            )

            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = "${current}g",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = textColor
                )
                Text(
                    text = "/${target}g",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = labelColor.copy(alpha = 0.8f),
                    modifier = Modifier.padding(bottom = 1.dp)
                )
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(CircleShape),
                color = barColor,
                trackColor = if (isHighlighted) Color(0x3310B981) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)
            )
        }
    }
}

@Composable
fun CustomCameraIcon(
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.size(24.dp)) {
        val w = size.width
        val h = size.height
        
        // Lens top cap
        drawRoundRect(
            color = color,
            topLeft = Offset(w * 0.32f, 0f),
            size = Size(w * 0.36f, h * 0.2f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
        )
        
        // Main camera body
        drawRoundRect(
            color = color,
            topLeft = Offset(0f, h * 0.18f),
            size = Size(w, h * 0.82f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f)
        )
        
        // Glass lens outer ring
        drawCircle(
            color = Color.White.copy(alpha = 0.25f),
            radius = w * 0.24f,
            center = Offset(w * 0.5f, h * 0.59f)
        )

        // Glass lens inner dot
        drawCircle(
            color = Color.White,
            radius = w * 0.14f,
            center = Offset(w * 0.5f, h * 0.59f)
        )
    }
}

@Composable
fun MealUploadWidget(
    selectedBitmap: Bitmap?,
    onPickClick: () -> Unit,
    onCameraClick: () -> Unit,
    onClearClick: () -> Unit
) {
    if (selectedBitmap == null) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Camera Card
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable { onCameraClick() }
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                                Color(0xFFE2F8FB).copy(alpha = 0.25f)
                            )
                        ),
                        shape = RoundedCornerShape(26.dp)
                    ),
                color = Color.Transparent,
                shape = RoundedCornerShape(26.dp),
                border = BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            CustomCameraIcon(
                                color = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Take Photo",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Use device camera",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Gallery Card
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable { onPickClick() }
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.15f),
                                Color(0xFFEEF2F6).copy(alpha = 0.2f)
                            )
                        ),
                        shape = RoundedCornerShape(26.dp)
                    ),
                color = Color.Transparent,
                shape = RoundedCornerShape(26.dp),
                border = BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f),
                        shape = CircleShape,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Browse Gallery Icon",
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Select Photo",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "JPEG, PNG, or WEBP",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    } else {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp),
            color = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(26.dp),
            shadowElevation = 0.dp
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Image(
                    bitmap = selectedBitmap.asImageBitmap(),
                    contentDescription = "Meal preview",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Black.copy(alpha = 0.35f), Color.Transparent, Color.Black.copy(alpha = 0.25f))
                            )
                        )
                )

                Surface(
                    color = Color.Black.copy(alpha = 0.6f),
                    shape = CircleShape,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(14.dp)
                        .size(32.dp)
                        .clickable { onClearClick() }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Clear preview image",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(14.dp)
                ) {
                    Text(
                        text = "MEAL PHOTO SELECTED",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }
    }
}

private fun getFoodEmoji(name: String): String {
    val lower = name.lowercase(Locale.getDefault())
    return when {
        "chicken" in lower -> "🍗"
        "salmon" in lower || "fish" in lower -> "🐟"
        "beef" in lower || "steak" in lower || "meat" in lower || "pork" in lower -> "🥩"
        "salad" in lower || "greens" in lower || "lettuce" in lower || "spinach" in lower -> "🥗"
        "rice" in lower -> "🍚"
        "egg" in lower -> "🍳"
        "bread" in lower || "toast" in lower || "sandwich" in lower -> "🍞"
        "avocado" in lower -> "🥑"
        "banana" in lower -> "🍌"
        "apple" in lower -> "🍎"
        "broc" in lower || "veg" in lower || "tomato" in lower || "onion" in lower -> "🥦"
        "pasta" in lower || "noodle" in lower -> "🍝"
        "pizza" in lower -> "🍕"
        "soup" in lower -> "🥣"
        "milk" in lower || "cream" in lower || "yogurt" in lower -> "🥛"
        "cheese" in lower -> "🧀"
        else -> "🍽️"
    }
}

private fun getFoodEmojiBg(name: String): Color {
    val lower = name.lowercase(Locale.getDefault())
    return when {
        "chicken" in lower || "steak" in lower || "beef" in lower || "meat" in lower -> Color(0xFFFFF7ED) // Orange 50
        "salad" in lower || "greens" in lower || "veg" in lower || "avocado" in lower || "broc" in lower -> Color(0xFFF0FDF4) // Green 50
        "salmon" in lower || "fish" in lower -> Color(0xFFF0F9FF) // Sky 50
        "rice" in lower || "bread" in lower || "pasta" in lower -> Color(0xFFFEF2F2) // Red/Slate 50
        else -> Color(0xFFF8FAFC) // Slate 50
    }
}

private fun getFoodEmojiTextColor(name: String): Color {
    val lower = name.lowercase(Locale.getDefault())
    return when {
        "chicken" in lower || "steak" in lower || "beef" in lower || "meat" in lower -> Color(0xFFC2410C) // Orange 700
        "salad" in lower || "greens" in lower || "veg" in lower || "avocado" in lower || "broc" in lower -> Color(0xFF15803D) // Green 700
        "salmon" in lower || "fish" in lower -> Color(0xFF0369A1) // Sky 700
        else -> Color(0xFF475569) // Slate 600
    }
}

@Composable
fun GeminiSparklesIcon(
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.size(24.dp)) {
        val w = size.width
        val h = size.height
        
        // Draw primary sparkle (large center-ish)
        val path1 = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.5f, h * 0.15f)
            quadraticTo(w * 0.5f, h * 0.5f, w * 0.85f, h * 0.5f)
            quadraticTo(w * 0.5f, h * 0.5f, w * 0.5f, h * 0.85f)
            quadraticTo(w * 0.5f, h * 0.5f, w * 0.15f, h * 0.5f)
            quadraticTo(w * 0.5f, h * 0.5f, w * 0.5f, h * 0.15f)
            close()
        }
        drawPath(path = path1, color = color)
        
        // Draw secondary sparkle (small top-right)
        val path2 = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.8f, h * 0.1f)
            quadraticTo(w * 0.8f, h * 0.25f, w * 0.95f, h * 0.25f)
            quadraticTo(w * 0.8f, h * 0.25f, w * 0.8f, h * 0.4f)
            quadraticTo(w * 0.8f, h * 0.25f, w * 0.65f, h * 0.25f)
            quadraticTo(w * 0.8f, h * 0.25f, w * 0.8f, h * 0.1f)
            close()
        }
        drawPath(path = path2, color = color.copy(alpha = 0.7f))
    }
}

@Composable
fun MacroProgressCard(
    label: String,
    value: String,
    progress: Float,
    percent: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = color.copy(alpha = 0.06f),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, color.copy(alpha = 0.15f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = label.uppercase(),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                    color = color
                )
                Text(
                    text = "$percent%",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            // Progress Bar
            Surface(
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = color.copy(alpha = 0.15f),
                shape = CircleShape
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress.coerceIn(0f, 1f))
                        .background(color, shape = CircleShape)
                )
            }
        }
    }
}

@Composable
fun MealAnalysisResultWidget(
    analysis: MealAnalysis,
    onAddToDailyTotal: () -> Unit,
    viewModel: CalBuddyViewModel
) {
    var isAdded by remember { mutableStateOf(false) }
    val nutrientTargets by viewModel.nutrientTargets.collectAsState()

    val targetCals = nutrientTargets.calories
    val targetProt = nutrientTargets.protein
    val targetFat = nutrientTargets.fat
    val targetFib = nutrientTargets.fiber

    val calPercent = if (targetCals > 0) (analysis.totalCalories.toFloat() / targetCals * 100).toInt() else 0
    val protPercent = if (targetProt > 0) (analysis.totalProtein.toFloat() / targetProt * 100).toInt() else 0
    val fatPercent = if (targetFat > 0) (analysis.totalFat.toFloat() / targetFat * 100).toInt() else 0
    val fibPercent = if (targetFib > 0) (analysis.totalFiber.toFloat() / targetFib * 100).toInt() else 0

    Column(
        modifier = Modifier.fillMaxWidth().animateContentSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Premium Gemini Brand Header Card
        Surface(
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.07f),
            shape = RoundedCornerShape(22.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                GeminiSparklesIcon(
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
                Column {
                    Text(
                        text = "DIETBUDDY SMART AI ANALYSIS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Visual parse successful. Review caloric breakdown below.",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // 2. High-Contrast Calories Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f)
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Circular indicator container
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(90.dp)
                ) {
                    Canvas(modifier = Modifier.size(90.dp)) {
                        // Background track
                        drawArc(
                            color = Color.LightGray.copy(alpha = 0.2f),
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                        )
                        // Active track
                        drawArc(
                            color = androidx.compose.ui.graphics.Color(0xFF10B981),
                            startAngle = -90f,
                            sweepAngle = (calPercent.toFloat() / 100f * 360f).coerceIn(0f, 360f),
                            useCenter = false,
                            style = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${analysis.totalCalories}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "kcal",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                        )
                    }
                }

                // Description of Calories
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "ESTIMATED CALORIES",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "This meal will impact $calPercent% of your daily limit of $targetCals kcal.",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 18.sp
                    )
                }
            }
        }

        // 3. Structured Macros Row (Grid of 3 items)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MacroProgressCard(
                label = "Protein",
                value = "${analysis.totalProtein}g",
                progress = if (targetProt > 0) analysis.totalProtein.toFloat() / targetProt else 0f,
                percent = protPercent,
                color = Color(0xFF10B981),
                modifier = Modifier.weight(1f)
            )

            MacroProgressCard(
                label = "Fat",
                value = "${analysis.totalFat}g",
                progress = if (targetFat > 0) analysis.totalFat.toFloat() / targetFat else 0f,
                percent = fatPercent,
                color = Color(0xFFF59E0B),
                modifier = Modifier.weight(1f)
            )

            MacroProgressCard(
                label = "Fiber",
                value = "${analysis.totalFiber}g",
                progress = if (targetFib > 0) analysis.totalFiber.toFloat() / targetFib else 0f,
                percent = fibPercent,
                color = Color(0xFF3B82F6),
                modifier = Modifier.weight(1f)
            )
        }

        // 4. AI Insights Card
        if (analysis.summary.isNotEmpty()) {
            Surface(
                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.2f),
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "✦",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = "AI INSIGHTS & REMARKS",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                    Text(
                        text = "\"${analysis.summary}\"",
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        fontWeight = FontWeight.Medium,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f)
                    )
                }
            }
        }

        // 4.5. Meal Health Assessment Card (Meal Score + Confidence Index)
        val computedMealScore = remember(analysis) {
            var rawScore = 65
            if (analysis.totalProtein > 20) rawScore += 15
            if (analysis.totalFiber > 5) rawScore += 15
            if (analysis.totalFat in 1..20) rawScore += 5
            rawScore.coerceIn(50, 98)
        }

        val macroProfileTag = remember(analysis) {
            val tags = mutableListOf<String>()
            if (analysis.totalProtein >= 15) tags.add("High Protein")
            if (analysis.totalFiber >= 4) tags.add("High Fiber")
            if (analysis.totalFat <= 15) tags.add("Moderate Fat") else tags.add("Rich Fats")
            if (tags.isEmpty()) tags.add("Balanced")
            tags.joinToString(" • ")
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Score Circular Indicator or Large Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.size(54.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "$computedMealScore",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary,
                                    lineHeight = 18.sp
                                )
                                Text(
                                    text = "SCORE",
                                    fontSize = 7.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            text = "MEAL DIETARY PROFILE",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                            letterSpacing = 0.6.sp
                        )
                        Text(
                            text = macroProfileTag,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Right: Vision Confidence badge
                Surface(
                    color = Color(0xFFE0F7FA), // Soft beautiful cyan bg
                    shape = CircleShape
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Vision Check",
                            tint = Color(0xFF00ACC1),
                            modifier = Modifier.size(11.dp)
                        )
                        Text(
                            text = "94% AI Vision",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF00838F)
                        )
                    }
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

        // 5. Ingredients Breakdown List Section
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Detected Food Breakdown (${analysis.foods.size})",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (analysis.foods.isNotEmpty()) {
                Text(
                    text = "Clear Current",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { viewModel.resetCurrentMeal() }
                )
            }
        }

        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            analysis.foods.forEachIndexed { index, food ->
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(18.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Surface(
                                color = getFoodEmojiBg(food.name),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.size(40.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = getFoodEmoji(food.name),
                                        fontSize = 20.sp
                                    )
                                }
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = food.name,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f, fill = false)
                                    )
                                    val badgeColor = if (food.isManual) Color(0xFF10B981) else MaterialTheme.colorScheme.primary
                                    val badgeText = if (food.isManual) "MANUAL" else "AI ESTIMATE"
                                    Surface(
                                        color = badgeColor.copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = badgeText,
                                            fontSize = 7.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = badgeColor,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "P: ${food.protein}g • F: ${food.fat}g • Fib: ${food.fiber}g",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = getFoodEmojiTextColor(food.name).copy(alpha = 0.85f)
                                    )
                                }
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "${food.calories} kcal",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Surface(
                                color = MaterialTheme.colorScheme.error.copy(alpha = 0.08f),
                                shape = CircleShape,
                                modifier = Modifier
                                    .size(24.dp)
                                    .clickable { viewModel.removeFoodItemFromMeal(index) }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Remove entry",
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

        // Food Database Live Search
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Supplement or Override with Food Database",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            var queryText by remember { mutableStateOf("") }
            val searchResults by viewModel.searchResults.collectAsState()
            val searchLoading by viewModel.searchLoading.collectAsState()
            val searchError by viewModel.searchError.collectAsState()

            OutlinedTextField(
                value = queryText,
                onValueChange = {
                    queryText = it
                    viewModel.searchFood(it)
                },
                placeholder = { Text("Search Open Food Facts database...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search database icon", modifier = Modifier.size(18.dp)) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                trailingIcon = {
                    if (queryText.isNotEmpty()) {
                        IconButton(onClick = {
                            queryText = ""
                            viewModel.searchFood("")
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear search", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            )

            if (searchLoading) {
                Box(modifier = Modifier.fillMaxWidth().padding(8.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                }
            }

            if (searchError != null && queryText.isNotEmpty()) {
                Text(
                    text = searchError ?: "",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }

            if (searchResults.isNotEmpty() && queryText.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 200.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        contentPadding = PaddingValues(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(searchResults) { food ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.addFoodItemToMeal(food)
                                        queryText = ""
                                        viewModel.searchFood("")
                                    }
                                    .padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(food.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("P: ${food.protein}g  F: ${food.fat}g  Fi: ${food.fiber}g", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text("+ ${food.calories} kcal", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                        }
                    }
                }
            }

            // Quick Custom Add form
            var showCustomForm by remember { mutableStateOf(false) }
            Text(
                text = if (showCustomForm) "✕ Hide Manual Food Item Entry" else "+ Or add a custom food item manually",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .clickable { showCustomForm = !showCustomForm }
                    .padding(vertical = 4.dp)
            )

            if (showCustomForm) {
                var customName by remember { mutableStateOf("") }
                var customCals by remember { mutableStateOf("") }
                var customProtein by remember { mutableStateOf("") }
                var customFat by remember { mutableStateOf("") }
                var customFiber by remember { mutableStateOf("") }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = customName,
                        onValueChange = { customName = it },
                        placeholder = { Text("e.g. Rice Pudding", fontSize = 12.sp) },
                        label = { Text("Food Name", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = customCals,
                            onValueChange = { customCals = it },
                            placeholder = { Text("kcal", fontSize = 12.sp) },
                            label = { Text("Calories", fontSize = 11.sp) },
                            modifier = Modifier.weight(1.5f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = customProtein,
                            onValueChange = { customProtein = it },
                            placeholder = { Text("g", fontSize = 12.sp) },
                            label = { Text("Protein", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = customFat,
                            onValueChange = { customFat = it },
                            placeholder = { Text("g", fontSize = 12.sp) },
                            label = { Text("Fat", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = customFiber,
                            onValueChange = { customFiber = it },
                            placeholder = { Text("g", fontSize = 12.sp) },
                            label = { Text("Fiber", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }
                    Button(
                        onClick = {
                            if (customName.isNotEmpty()) {
                                val calVal = customCals.toIntOrNull() ?: 0
                                val protVal = customProtein.toIntOrNull() ?: 0
                                val fatVal = customFat.toIntOrNull() ?: 0
                                val fibVal = customFiber.toIntOrNull() ?: 0
                                viewModel.addFoodItemToMeal(
                                    FoodItem(
                                        name = customName,
                                        calories = calVal,
                                        protein = protVal,
                                        fat = fatVal,
                                        fiber = fibVal,
                                        isManual = true
                                    )
                                )
                                customName = ""
                                customCals = ""
                                customProtein = ""
                                customFat = ""
                                customFiber = ""
                                showCustomForm = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(42.dp),
                        enabled = customName.isNotEmpty(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Add Manual Item", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = { viewModel.resetCurrentMeal() },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Discard", fontWeight = FontWeight.Bold)
            }

            Button(
                onClick = {
                    if (!isAdded) {
                        onAddToDailyTotal()
                        isAdded = true
                    }
                },
                modifier = Modifier
                    .weight(2.5f)
                    .height(52.dp),
                enabled = !isAdded && analysis.foods.isNotEmpty(),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isAdded) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f) else MaterialTheme.colorScheme.primary,
                    contentColor = if (isAdded) MaterialTheme.colorScheme.onSurfaceVariant else Color.White
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Confirm",
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isAdded) "Added to Today's Total!" else "Add to Today's Total",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}

@Composable
fun MacroChip(
    label: String,
    value: String,
    color: Color
) {
    Surface(
        color = color.copy(alpha = 0.08f),
        shape = CircleShape,
        border = BorderStroke(1.dp, color.copy(alpha = 0.15f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(color, CircleShape)
            )
            Text(
                text = "$label: $value",
                fontSize = 12.sp,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun SavedMealLogCard(
    savedMeal: SavedMeal,
    onDeleteClick: () -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded }
            .animateContentSize(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = remember(savedMeal.timestamp) {
                            val formatter = SimpleDateFormat("h:mm a - d MMM yyyy", Locale.getDefault())
                            formatter.format(Date(savedMeal.timestamp))
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = savedMeal.analysis.foods.joinToString { it.name }.ifEmpty { "Manual Meal" },
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.Info else Icons.Default.Star,
                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                        tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
                        modifier = Modifier.size(16.dp)
                    )
                    
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = CircleShape,
                        modifier = Modifier
                            .size(32.dp)
                            .clickable { onDeleteClick() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete log entry",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Calories: ${savedMeal.analysis.totalCalories} kcal",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Protein: ${savedMeal.analysis.totalProtein}g",
                    fontSize = 12.sp,
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Fat: ${savedMeal.analysis.totalFat}g",
                    fontSize = 12.sp,
                    color = Color(0xFFF59E0B),
                    fontWeight = FontWeight.Bold
                )
            }

            if (isExpanded) {
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 4.dp))
                
                Text(
                    text = "Foods Breakdown (${savedMeal.analysis.foods.size} items)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    savedMeal.analysis.foods.forEach { food ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(getFoodEmoji(food.name), fontSize = 16.sp)
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = food.name,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        val badgeColor = if (food.isManual) Color(0xFF10B981) else MaterialTheme.colorScheme.primary
                                        val badgeText = if (food.isManual) "MANUAL" else "AI"
                                        Surface(
                                            color = badgeColor.copy(alpha = 0.12f),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = badgeText,
                                                fontSize = 7.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = badgeColor,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        text = "P: ${food.protein}g  F: ${food.fat}g  Fi: ${food.fiber}g",
                                        fontSize = 9.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Text(
                                text = "${food.calories} kcal",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                
                if (savedMeal.analysis.summary.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "\"${savedMeal.analysis.summary}\"",
                            fontSize = 11.sp,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(8.dp),
                            lineHeight = 15.sp
                        )
                    }
                }
            } else {
                Text(
                    text = "Tap to view detailed breakdown",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp)
                )
            }
        }
    }
}

private fun uriToBitmap(context: Context, uri: Uri): Bitmap? {
    return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val source = ImageDecoder.createSource(context.contentResolver, uri)
            ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                decoder.isMutableRequired = true
            }
        } else {
            @Suppress("DEPRECATION")
            MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
        }
    } catch (e: Exception) {
        null
    }
}

private fun createTempPictureUri(context: Context): Uri {
    val tempFile = java.io.File(context.cacheDir, "temp_meal_photo.jpg").apply {
        if (exists()) delete()
        createNewFile()
    }
    return androidx.core.content.FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        tempFile
    )
}

@Composable
fun SettingsDialog(
    initialTargets: com.example.model.NutrientTargets,
    viewModel: CalBuddyViewModel,
    onDismiss: () -> Unit,
    onSave: (com.example.model.NutrientTargets) -> Unit
) {
    var caloriesStr by remember { mutableStateOf(initialTargets.calories.toString()) }
    var proteinStr by remember { mutableStateOf(initialTargets.protein.toString()) }
    var fatStr by remember { mutableStateOf(initialTargets.fat.toString()) }
    var fiberStr by remember { mutableStateOf(initialTargets.fiber.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Settings Icon",
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Daily Nutritional Goals",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Personalize your daily targets. The charts and indicators will adapt to your new choices immediately.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = caloriesStr,
                    onValueChange = { if (it.isEmpty() || it.all { char -> char.isDigit() }) caloriesStr = it },
                    label = { Text("Calories Target (kcal)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = proteinStr,
                    onValueChange = { if (it.isEmpty() || it.all { char -> char.isDigit() }) proteinStr = it },
                    label = { Text("Protein Target (g)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = fatStr,
                    onValueChange = { if (it.isEmpty() || it.all { char -> char.isDigit() }) fatStr = it },
                    label = { Text("Fat Target (g)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = fiberStr,
                    onValueChange = { if (it.isEmpty() || it.all { char -> char.isDigit() }) fiberStr = it },
                    label = { Text("Fiber Target (g)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 4.dp))
                
                val isSyncing by viewModel.isSyncing.collectAsState()
                val syncError by viewModel.syncError.collectAsState()
                val syncSuccess by viewModel.syncSuccess.collectAsState()
                val isPremium by viewModel.isPremium.collectAsState()

                Text(
                    text = "Cloud Synchronization",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                if (!isPremium) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "☁ Sync requires dietBuddy Premium",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "Upgrade to sync meals with the dietBuddy Web portal in real-time.",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Button(
                                onClick = {
                                    viewModel.setPremium(true)
                                },
                                modifier = Modifier.fillMaxWidth().height(36.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Unlock Premium Now", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Status: Connected as guest-user-uuid (dietBuddy Premium)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        
                        if (isSyncing) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                Text("Syncing goals & logs...", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                            }
                        } else {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = { 
                                        viewModel.performSync()
                                    },
                                    modifier = Modifier.weight(1f).height(38.dp),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Sync Now", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                
                                if (syncSuccess || syncError != null) {
                                    OutlinedButton(
                                        onClick = { viewModel.clearSyncStatus() },
                                        modifier = Modifier.height(38.dp),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("Clear", fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        if (syncSuccess) {
                            Text(
                                text = "✓ Cloud data merged successfully!",
                                fontSize = 11.sp,
                                color = Color(0xFF10B981),
                                fontWeight = FontWeight.Bold
                            )
                        }

                        if (syncError != null) {
                            Text(
                                text = syncError ?: "",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.error,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val calVal = caloriesStr.toIntOrNull() ?: initialTargets.calories
                    val protVal = proteinStr.toIntOrNull() ?: initialTargets.protein
                    val fatVal = fatStr.toIntOrNull() ?: initialTargets.fat
                    val fibVal = fiberStr.toIntOrNull() ?: initialTargets.fiber
                    onSave(com.example.model.NutrientTargets(calVal, protVal, fatVal, fibVal))
                    onDismiss()
                }
            ) {
                Text("Save Goals")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        shape = RoundedCornerShape(28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    )
}
