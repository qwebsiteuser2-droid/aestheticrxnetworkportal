import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Search for nearby doctors
 * GET /api/public/doctors/nearby
 * Query params: lat, lng, radius (km, default 50), limit (default 10), specialty
 */
export const getNearbyDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius = 50, limit = 10, specialty, available_only } = req.query;

    // Validate coordinates
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const searchRadius = parseFloat(radius as string);
    const resultLimit = parseInt(limit as string, 10);

    if (isNaN(userLat) || isNaN(userLng)) {
      res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Build query for approved doctors (location optional for better results)
    // Exclude admin accounts from doctor listing
    let query = doctorRepository
      .createQueryBuilder('doctor')
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.profile_photo_url',
        'doctor.bio',
        'doctor.tags',
        'doctor.google_location',
        'doctor.tier',
        'doctor.created_at',
        'doctor.is_online',
        'doctor.availability_status',
        'doctor.last_active_at',
      ])
      .where('doctor.user_type = :userType', { userType: UserType.DOCTOR })
      .andWhere('doctor.is_approved = true')
      .andWhere('doctor.is_deactivated = false')
      .andWhere('doctor.is_admin = false');

    // Filter by specialty/tag if provided (only use tags - specialties column might not exist yet)
    if (specialty) {
      query = query.andWhere(':specialty = ANY(doctor.tags)', {
        specialty: specialty,
      });
    }

    // Note: availability_status filtering disabled until migration runs

    const doctors = await query.getMany();

    // Calculate distances and filter by radius
    const doctorsWithDistance = doctors
      .map((doctor) => {
        const location = doctor.google_location;
        let distance: number | null = null;
        
        // Calculate distance if location is available
        if (location && location.lat && location.lng) {
          distance = calculateDistance(userLat, userLng, location.lat, location.lng);
          // Skip if outside search radius
          if (distance > searchRadius) {
            return null;
          }
        }

        return {
          id: doctor.id,
          doctor_name: doctor.doctor_name,
          clinic_name: doctor.clinic_name,
          profile_photo_url: doctor.profile_photo_url,
          bio: doctor.bio,
          tags: doctor.tags || [],
          specialties: (doctor as any).specialties || [],
          google_location: doctor.google_location,
          is_online: (doctor as any).is_online ?? false,
          availability_status: (doctor as any).availability_status || 'available',
          last_active_at: (doctor as any).last_active_at,
          distance_km: distance !== null ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => {
        // Sort by distance (doctors with location first, then by distance)
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      })
      .slice(0, resultLimit);

    res.json({
      success: true,
      data: {
        doctors: doctorsWithDistance,
        total: doctorsWithDistance.length,
        search_params: {
          lat: userLat,
          lng: userLng,
          radius_km: searchRadius,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching nearby doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby doctors',
    });
  }
};

/**
 * Search doctors by query (name, clinic, specialty)
 * GET /api/public/doctors/search
 */
export const searchDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, lat, lng, page = 1, limit = 20 } = req.query;

    const searchQuery = (q as string || '').trim().toLowerCase();
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Exclude admin accounts from doctor listing
    let query = doctorRepository
      .createQueryBuilder('doctor')
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.profile_photo_url',
        'doctor.bio',
        'doctor.tags',
        'doctor.google_location',
        'doctor.tier',
        'doctor.created_at',
        'doctor.is_online',
        'doctor.availability_status',
        'doctor.last_active_at',
      ])
      .where('doctor.user_type = :userType', { userType: UserType.DOCTOR })
      .andWhere('doctor.is_approved = true')
      .andWhere('doctor.is_deactivated = false')
      .andWhere('doctor.is_admin = false');

    // Search by name, clinic, or tags
    if (searchQuery) {
      query = query.andWhere(
        '(LOWER(doctor.doctor_name) LIKE :search OR LOWER(doctor.clinic_name) LIKE :search OR :searchExact = ANY(doctor.tags))',
        { search: `%${searchQuery}%`, searchExact: searchQuery }
      );
    }

    // Get total count
    const total = await query.getCount();

    // Get paginated results
    const doctors = await query
      .skip(offset)
      .take(limitNum)
      .getMany();

    // Calculate distances if coordinates provided
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const hasLocation = !isNaN(userLat) && !isNaN(userLng);

    const doctorsWithDistance = doctors.map((doctor) => {
      const result: any = {
        id: doctor.id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        profile_photo_url: doctor.profile_photo_url,
        bio: doctor.bio,
        tags: doctor.tags || [],
        specialties: (doctor as any).specialties || [],
        google_location: doctor.google_location,
        is_online: (doctor as any).is_online ?? false,
        availability_status: (doctor as any).availability_status || 'available',
        last_active_at: (doctor as any).last_active_at,
      };

      if (hasLocation && doctor.google_location?.lat && doctor.google_location?.lng) {
        result.distance_km = Math.round(
          calculateDistance(userLat, userLng, doctor.google_location.lat, doctor.google_location.lng) * 10
        ) / 10;
      }

      return result;
    });

    // Sort by distance if location provided
    if (hasLocation) {
      doctorsWithDistance.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    res.json({
      success: true,
      data: {
        doctors: doctorsWithDistance,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search doctors',
    });
  }
};

/**
 * Get public doctor profile
 * GET /api/public/doctors/:id
 */
export const getDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    const doctor = await doctorRepository
      .createQueryBuilder('doctor')
      .select([
        'doctor.id',
        'doctor.doctor_name',
        'doctor.clinic_name',
        'doctor.profile_photo_url',
        'doctor.bio',
        'doctor.tags',
        'doctor.google_location',
        'doctor.tier',
        'doctor.created_at',
        'doctor.is_online',
        'doctor.availability_status',
        'doctor.last_active_at',
      ])
      .where('doctor.id = :id', { id })
      .andWhere('doctor.user_type = :userType', { userType: UserType.DOCTOR })
      .andWhere('doctor.is_approved = true')
      .andWhere('doctor.is_deactivated = false')
      .getOne();

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: doctor.id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        profile_photo_url: doctor.profile_photo_url,
        bio: doctor.bio,
        tags: doctor.tags || [],
        specialties: [],
        google_location: doctor.google_location,
        is_online: doctor.is_online ?? false,
        availability_status: doctor.availability_status || 'available',
        last_active_at: doctor.last_active_at || null,
        tier: doctor.tier,
        created_at: doctor.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile',
    });
  }
};

/**
 * Update doctor availability status (authenticated)
 * PUT /api/auth/availability
 */
export const updateAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { availability_status } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const validStatuses = ['available', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(availability_status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid availability status. Must be: available, away, busy, or offline',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    
    await doctorRepository.update(userId, {
      availability_status,
      last_active_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability_status },
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
    });
  }
};

