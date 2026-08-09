package ru.niksen111.repitma.error

import org.springframework.http.HttpStatus
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import ru.niksen111.repitma.users.exception.UsernameAlreadyExistsException
import ru.niksen111.repitma.users.exception.ValidationException

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(ValidationException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun authValidationFailed(exception: ValidationException) =
        ApiError(code = ApiErrorCode.VALIDATION_FAILED, message = exception.message.orEmpty())

    @ExceptionHandler(UsernameAlreadyExistsException::class)
    @ResponseStatus(HttpStatus.CONFLICT)
    fun usernameAlreadyExists(exception: UsernameAlreadyExistsException) =
        ApiError(code = ApiErrorCode.USERNAME_EXISTS, message = exception.message.orEmpty())

    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun validationFailed(exception: MethodArgumentNotValidException): ApiError {
        val fields = exception.bindingResult.fieldErrors.associate { it.field to it.defaultMessage.orEmpty() }
        return ApiError(
            code = ApiErrorCode.VALIDATION_FAILED,
            message = "Проверьте введенные данные",
            fields = fields,
        )
    }
}
