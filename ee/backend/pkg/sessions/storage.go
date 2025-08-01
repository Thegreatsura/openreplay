package sessions

import (
	"fmt"

	"github.com/jackc/pgtype"
	"github.com/lib/pq"

	"openreplay/backend/pkg/db/postgres/pool"
)

type Storage interface {
	Add(sess *Session) error
	Get(sessionID uint64) (*Session, error)
	GetMany(sessionIDs []uint64) ([]*Session, error)
	GetDuration(sessionID uint64) (uint64, error)
	UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error)
	InsertEncryptionKey(sessionID uint64, key []byte) error
	InsertUserID(sessionID uint64, userID string) error
	InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error
	InsertReferrer(sessionID uint64, referrer, baseReferrer string) error
	InsertMetadata(sessionID uint64, keyNo uint, value string) error
}

type storageImpl struct {
	db pool.Pool
}

func NewStorage(db pool.Pool) Storage {
	return &storageImpl{
		db: db,
	}
}

func (s *storageImpl) Add(sess *Session) error {
	return s.db.Exec(`
		INSERT INTO sessions (
			session_id, project_id, start_ts,
			user_uuid, user_device, user_device_type, user_country,
			user_os, user_os_version,
			rev_id, 
			tracker_version, issue_score,
			platform,
			user_browser, user_browser_version, user_device_memory_size, user_device_heap_size,
			user_id, user_state, user_city, timezone, screen_width, screen_height
		) VALUES (
			$1, $2, $3,
			$4, $5, $6, $7, 
			$8, NULLIF($9, ''),
			NULLIF($10, ''), 
			$11, $12,
			$13,
			NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, 0), NULLIF($17, 0::bigint),
			NULLIF(LEFT($18, 8000), ''), NULLIF($19, ''), NULLIF($20, ''), $21, $22, $23
		)`,
		sess.SessionID, sess.ProjectID, sess.Timestamp,
		sess.UserUUID, sess.UserDevice, sess.UserDeviceType, sess.UserCountry,
		sess.UserOS, sess.UserOSVersion,
		sess.RevID,
		sess.TrackerVersion, sess.Timestamp/1000,
		sess.Platform,
		sess.UserBrowser, sess.UserBrowserVersion, sess.UserDeviceMemorySize, sess.UserDeviceHeapSize,
		sess.UserID, sess.UserState, sess.UserCity, sess.Timezone, sess.ScreenWidth, sess.ScreenHeight,
	)
}

func (s *storageImpl) Get(sessionID uint64) (*Session, error) {
	sess := &Session{SessionID: sessionID}
	var revID, userOSVersion, userBrowser, userBrowserVersion, userState, userCity *string
	var issueTypes pgtype.EnumArray
	if err := s.db.QueryRow(`
		SELECT platform,
			duration, project_id, start_ts, timezone,
			user_uuid, user_os, user_os_version, 
			user_device, user_device_type, user_country, user_state, user_city,
			rev_id, tracker_version,
			user_id, user_anonymous_id, referrer,
			pages_count, events_count, errors_count, issue_types,
			user_browser, user_browser_version, issue_score,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10,
			utm_source, utm_medium, utm_campaign
		FROM sessions
		WHERE session_id=$1 
	`,
		sessionID,
	).Scan(&sess.Platform,
		&sess.Duration, &sess.ProjectID, &sess.Timestamp, &sess.Timezone,
		&sess.UserUUID, &sess.UserOS, &userOSVersion,
		&sess.UserDevice, &sess.UserDeviceType, &sess.UserCountry, &userState, &userCity,
		&revID, &sess.TrackerVersion,
		&sess.UserID, &sess.UserAnonymousID, &sess.Referrer,
		&sess.PagesCount, &sess.EventsCount, &sess.ErrorsCount, &issueTypes,
		&userBrowser, &userBrowserVersion, &sess.IssueScore,
		&sess.Metadata1, &sess.Metadata2, &sess.Metadata3, &sess.Metadata4, &sess.Metadata5,
		&sess.Metadata6, &sess.Metadata7, &sess.Metadata8, &sess.Metadata9, &sess.Metadata10,
		&sess.UtmSource, &sess.UtmMedium, &sess.UtmCampaign); err != nil {
		return nil, err
	}
	if userOSVersion != nil {
		sess.UserOSVersion = *userOSVersion
	}
	if userBrowser != nil {
		sess.UserBrowser = *userBrowser
	}
	if userBrowserVersion != nil {
		sess.UserBrowserVersion = *userBrowserVersion
	}
	if revID != nil {
		sess.RevID = *revID
	}
	issueTypes.AssignTo(&sess.IssueTypes)
	if userState != nil {
		sess.UserState = *userState
	}
	if userCity != nil {
		sess.UserCity = *userCity
	}
	return sess, nil
}

// For the ender service only
func (s *storageImpl) GetMany(sessionIDs []uint64) ([]*Session, error) {
	rows, err := s.db.Query(`SELECT 
		session_id, 
		CASE 
			WHEN duration IS NULL OR duration < 0 THEN 0 
			ELSE duration 
		END, 
		start_ts 
	FROM sessions 
	WHERE session_id = ANY($1)`, pq.Array(sessionIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sessions := make([]*Session, 0, len(sessionIDs))
	for rows.Next() {
		sess := &Session{}
		if err := rows.Scan(&sess.SessionID, &sess.Duration, &sess.Timestamp); err != nil {
			return nil, err
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *storageImpl) GetDuration(sessionID uint64) (uint64, error) {
	var dur uint64
	if err := s.db.QueryRow("SELECT COALESCE( duration, 0 ) FROM sessions WHERE session_id=$1", sessionID).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *storageImpl) UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error) {
	var dur uint64
	if err := s.db.QueryRow(`
		UPDATE sessions SET duration=$2 - start_ts
		WHERE session_id=$1
		RETURNING duration
	`,
		sessionID, timestamp,
	).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *storageImpl) InsertEncryptionKey(sessionID uint64, key []byte) error {
	sqlRequest := `
		UPDATE sessions 
		SET file_key = $2 
		WHERE session_id = $1`
	return s.db.Exec(sqlRequest, sessionID, string(key))
}

func (s *storageImpl) InsertUserID(sessionID uint64, userID string) error {
	sqlRequest := `
		UPDATE sessions 
		SET user_id = LEFT($1, 8000) 
		WHERE session_id = $2`
	return s.db.Exec(sqlRequest, userID, sessionID)
}

func (s *storageImpl) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	sqlRequest := `
		UPDATE sessions 
		SET user_anonymous_id = LEFT($1, 8000) 
		WHERE session_id = $2`
	return s.db.Exec(sqlRequest, userAnonymousID, sessionID)
}

func (s *storageImpl) InsertReferrer(sessionID uint64, referrer, baseReferrer string) error {
	sqlRequest := `
		UPDATE sessions 
		SET referrer = LEFT($1, 8000), base_referrer = LEFT($2, 8000) 
		WHERE session_id = $3 AND referrer IS NULL`
	return s.db.Exec(sqlRequest, referrer, baseReferrer, sessionID)
}

func (s *storageImpl) InsertMetadata(sessionID uint64, keyNo uint, value string) error {
	sqlRequest := `
		UPDATE sessions 
		SET metadata_%v = LEFT($1, 8000) 
		WHERE session_id = $2`
	return s.db.Exec(fmt.Sprintf(sqlRequest, keyNo), value, sessionID)
}
