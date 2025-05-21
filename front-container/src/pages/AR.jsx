import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../store/hooks';
import { UserModel } from '../store/auth/authSlice';
import './AR.css';
import './notifications.css';

// ... existing code ... 